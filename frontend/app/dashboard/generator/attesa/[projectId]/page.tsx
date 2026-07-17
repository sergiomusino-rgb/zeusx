'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, ExternalLink, AlertCircle, Construction } from 'lucide-react';
import { supabaseBrowser } from '@/src/lib/supabase-browser';
import { useLanguage } from '@/src/lib/LanguageContext';

const apiUrl = process.env.NEXT_PUBLIC_TOTALUM_API_URL || 'https://api-accounts.totalum.app';
const apiKey = process.env.NEXT_PUBLIC_TOTALUM_API_KEY || '';

export default function WaitingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [status, setStatus] = useState<'creating' | 'building' | 'done' | 'error'>('creating');
  const [conversations, setConversations] = useState<{author:string;message:string;messageType:string}[]>([]);
  const [projectUrl, setProjectUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<NodeJS.Timeout|null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [conversations]);

  useEffect(() => {
    if (!projectId) return;
    
    const poll = async () => {
      try {
        // Get auth token
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        
        if (!session?.access_token) {
          console.error('[WaitingPage] No auth session found');
          setStatus('error');
          setErrorMsg(t('waiting_error_invalid_session'));
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }

        const headers: Record<string, string> = {
          'api-key': apiKey,
          'Authorization': `Bearer ${session.access_token}`
        };

        const r = await fetch(`${apiUrl}/api/v1/vcaas/projects/${projectId}/agent/status`, { headers });
        
        if (!r.ok) {
          const errorText = await r.text();
          console.error('[WaitingPage] Status check failed:', r.status, errorText);
          
          if (r.status === 401) {
            setStatus('error');
            setErrorMsg(t('waiting_error_session_expired'));
          } else {
            setStatus('error');
            setErrorMsg(t('waiting_error_status_check').replace('{status}', r.status.toString()));
          }
          
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
        
        const d = await r.json();
        if (d.errors) { 
          setStatus('error'); 
          setErrorMsg(d.errors.errorMessage || t('waiting_error_generic')); 
          if (pollRef.current) clearInterval(pollRef.current);
          return; 
        }
        
        const a = d.data;
        if (a.realtimeConversation) setConversations(a.realtimeConversation);
        if (a.status==='done') {
          setStatus('done');
          setProjectUrl('https://www.totalum.app/projects/'+projectId);
          
          try {
            const pr = await fetch(`${apiUrl}/api/v1/vcaas/projects/${projectId}`, { headers });
            if (pr.ok) {
              const pd = await pr.json();
              if (pd.data?.temporalDevelopmentProjectUrl) setPreviewUrl(pd.data.temporalDevelopmentProjectUrl);
            }
          } catch (err) {
            console.error('[WaitingPage] Error fetching project details:', err);
          }
          
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (a.status==='init') setStatus('building');
      } catch(e){
        console.error('[WaitingPage] Polling error:', e);
        // Non interrompere il polling per errori temporanei
      }
    };
    
    poll();
    pollRef.current = setInterval(poll, 10000);
    
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  },[projectId]);

  // Redirect automatico alla pagina di successo dopo 2 secondi
  useEffect(() => {
    if (status === 'done' && projectUrl) {
      const redirectTimer = setTimeout(() => {
        router.push(`/dashboard/generator/success?projectId=${encodeURIComponent(projectId)}&projectUrl=${encodeURIComponent(projectUrl)}`);
      }, 2000);
      return () => clearTimeout(redirectTimer);
    }
  }, [status, projectUrl, projectId, router]);

  const icon = status==='creating'?<Construction className="w-16 h-16 text-violet-400 animate-bounce"/>:
               status==='building'?<Loader2 className="w-16 h-16 text-violet-400 animate-spin"/>:
               status==='done'?<CheckCircle2 className="w-16 h-16 text-emerald-400"/>:
               <AlertCircle className="w-16 h-16 text-red-400"/>;

  const title = status==='creating'?t('waiting_title_creating'):
               status==='building'?t('waiting_title_building'):
               status==='done'?t('waiting_title_done'):t('waiting_title_error');
  const sub = status==='creating'?t('waiting_subtitle_creating'):
              status==='building'?t('waiting_subtitle_building'):
              status==='done'?t('waiting_subtitle_done'):
              errorMsg;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-3xl p-8 md:p-12 text-center">
        <div className="mb-6 flex justify-center">{icon}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h1>
        <p className="text-gray-400 text-lg mb-8">{sub}</p>
        {(status==='creating'||status==='building')&&(
          <div className="w-full bg-slate-800 rounded-full h-2 mb-8 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full animate-pulse" style={{width:status==='creating'?'20%':'60%'}}/>
          </div>
        )}
        {status==='building'&&conversations.length>0&&(
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-6 mb-8 max-h-64 overflow-y-auto text-left">
            <h3 className="text-sm text-gray-500 mb-3 font-semibold uppercase">{t('waiting_log_title')}</h3>
            {conversations.map((m,i)=>(
              <div key={i} className={`mb-2 flex items-start gap-2 ${
                m.messageType==='finished'?'text-emerald-400':m.messageType==='error'?'text-red-400':
                m.messageType==='building'?'text-violet-400':m.messageType==='starting'?'text-amber-400':'text-gray-300'
              }`}>
                <span className="text-xs mt-1">{m.messageType==='starting'?'🚀':m.messageType==='building'?'🔧':m.messageType==='finished'?'✅':m.messageType==='error'?'❌':'💬'}</span>
                <span className="text-sm">{m.message}</span>
              </div>
            ))}
            <div ref={endRef}/>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {status==='done'&&(<>
            <a href={projectUrl} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-violet-600/20">
              <ExternalLink className="w-5 h-5"/> {t('waiting_button_go_to_project')}
            </a>
            {previewUrl&&(
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold border border-slate-700">
                <ExternalLink className="w-5 h-5"/> {t('waiting_button_preview')}
              </a>
            )}
            <button onClick={()=>router.push('/dashboard/generator')}
                    className="bg-slate-800 hover:bg-slate-700 text-gray-300 px-8 py-4 rounded-xl font-semibold">{t('waiting_button_back_to_generator')}</button>
          </>)}
          {status==='error'&&(
            <button onClick={()=>router.push('/dashboard/generator')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold">{t('waiting_button_retry')}</button>
          )}
        </div>
        {projectId&&<div className="mt-6 text-xs text-gray-600">ID: {projectId}</div>}
      </div>
    </div>
  );
}
