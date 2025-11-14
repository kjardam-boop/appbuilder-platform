-- Create AI Chat Sessions and Messages tables for conversation history

-- Table: ai_chat_sessions
-- Stores chat sessions with auto-generated titles
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: ai_chat_messages
-- Stores individual messages within sessions
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant ON public.ai_chat_sessions(tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.ai_chat_sessions(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.ai_chat_messages(session_id, created_at ASC);

-- Enable RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_chat_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.ai_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.ai_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.ai_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.ai_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON public.ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE id = ai_chat_messages.session_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE id = ai_chat_messages.session_id
      AND user_id = auth.uid()
    )
  );

-- Trigger to update last_message_at
CREATE OR REPLACE FUNCTION public.update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_chat_sessions
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_session_last_message
  AFTER INSERT ON public.ai_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_last_message();

-- Function to auto-generate session title from first user message
CREATE OR REPLACE FUNCTION public.generate_session_title()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate title for first user message and if session has no title
  IF NEW.role = 'user' AND NOT EXISTS (
    SELECT 1 FROM public.ai_chat_messages 
    WHERE session_id = NEW.session_id 
    AND id != NEW.id
  ) THEN
    UPDATE public.ai_chat_sessions
    SET title = CASE
      WHEN LENGTH(NEW.content) > 50 THEN SUBSTRING(NEW.content FROM 1 FOR 47) || '...'
      ELSE NEW.content
    END
    WHERE id = NEW.session_id AND title IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_generate_session_title
  AFTER INSERT ON public.ai_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_session_title();