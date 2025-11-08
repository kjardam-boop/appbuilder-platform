/**
 * Jul25 Notification Service
 * Handles n8n workflow triggers for notifications
 */

import { supabase } from '@/integrations/supabase/client';

export interface SendInvitationParams {
  recipient: string; // phone or email
  method: 'sms' | 'email';
  message: string;
  invitationType: 'family_member' | 'guest';
  familyId?: string;
}

export interface NotifyTaskParams {
  taskId: string;
  taskTitle: string;
  assignedTo?: string;
  familyId: string;
  notificationType: 'created' | 'assigned' | 'completed';
}

export interface NotifyUserRegisteredParams {
  userId: string;
  userEmail: string;
  userName?: string;
  familyId: string;
}

/**
 * Send invitation via n8n workflow (SMS or Email)
 */
export async function sendInvitation(
  tenantId: string,
  userId: string,
  params: SendInvitationParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
      body: {
        workflowKey: 'jul25_send_invitation',
        action: 'send_invitation',
        tenantId,
        input: {
          recipient: params.recipient,
          method: params.method,
          message: params.message,
          invitation_type: params.invitationType,
          family_id: params.familyId,
          sent_by: userId,
        },
      },
    });

    if (error) {
      console.error('[Jul25NotificationService] Send invitation error:', error);
      return { ok: false, error: error.message };
    }

    console.log('[Jul25NotificationService] Invitation sent:', data);
    return { ok: true };
  } catch (error: any) {
    console.error('[Jul25NotificationService] Send invitation exception:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Notify about new user registration
 */
export async function notifyUserRegistered(
  tenantId: string,
  params: NotifyUserRegisteredParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
      body: {
        workflowKey: 'jul25_user_registered',
        action: 'user_registered',
        tenantId,
        input: {
          user_id: params.userId,
          user_email: params.userEmail,
          user_name: params.userName,
          family_id: params.familyId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    if (error) {
      console.error('[Jul25NotificationService] User registered error:', error);
      return { ok: false, error: error.message };
    }

    console.log('[Jul25NotificationService] User registered notification sent:', data);
    return { ok: true };
  } catch (error: any) {
    console.error('[Jul25NotificationService] User registered exception:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Notify about task creation or assignment
 */
export async function notifyTask(
  tenantId: string,
  userId: string,
  params: NotifyTaskParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    const workflowKey =
      params.notificationType === 'assigned'
        ? 'jul25_task_assigned'
        : 'jul25_task_created';

    const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
      body: {
        workflowKey,
        action: params.notificationType === 'assigned' ? 'task_assigned' : 'task_created',
        tenantId,
        input: {
          task_id: params.taskId,
          task_title: params.taskTitle,
          assigned_to: params.assignedTo,
          family_id: params.familyId,
          notification_type: params.notificationType,
          triggered_by: userId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    if (error) {
      console.error('[Jul25NotificationService] Task notification error:', error);
      return { ok: false, error: error.message };
    }

    console.log('[Jul25NotificationService] Task notification sent:', data);
    return { ok: true };
  } catch (error: any) {
    console.error('[Jul25NotificationService] Task notification exception:', error);
    return { ok: false, error: error.message };
  }
}
