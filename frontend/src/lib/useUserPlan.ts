'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from './supabase-browser';

// Admin user ID from admin page
const ADMIN_USER_ID = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';

export type UserPlan = 'free' | 'starter' | 'pro' | 'business';
export type UserRole = 'admin' | 'reseller' | 'viewer' | 'editor' | 'agent';

export function useUserPlan() {
  const [plan, setPlan] = useState<UserPlan>('free');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReseller, setIsReseller] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    fetchUserPlan();
  }, []);

const fetchUserPlan = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session?.user) {
      setPlan('free');
      setIsAdmin(false);
      setIsReseller(false);
      setUserRole(null);
      setLoading(false);
      return;
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabaseBrowser
      .from('profiles')
      .select('role, subscription_plan')
      .eq('user_id', session.user.id)
      .single();

    // Check if user is admin (by ID or by role)
    const isUserAdmin = session.user.id === ADMIN_USER_ID || profile?.role === 'admin';
    setIsAdmin(isUserAdmin);

    // Check if user is reseller
    const isUserReseller = profile?.role === 'reseller';
    setIsReseller(isUserReseller);

    // Set user role
    setUserRole(profile?.role as UserRole || null);

    // Get user plan
    const { data: tenant } = await supabaseBrowser
      .from('tenants')
      .select('plan')
      .eq('owner_id', session.user.id)
      .single();

    setPlan((tenant?.plan as UserPlan) || 'free');
    setLoading(false);
  };

  const isProOrBusiness = plan === 'pro' || plan === 'business';

  return { 
    plan, 
    loading, 
    isProOrBusiness, 
    isAdmin, 
    isReseller,
    userRole,
    refetch: fetchUserPlan 
  };
}