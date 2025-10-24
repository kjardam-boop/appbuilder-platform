-- Create profiles table for user profile data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  title TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunities table for sales pipeline
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID,
  stage TEXT NOT NULL DEFAULT 'lead',
  value NUMERIC,
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  actual_close_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table for opportunity line items
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  price NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunity_products junction table
CREATE TABLE IF NOT EXISTS public.opportunity_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC,
  discount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  created_by UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  context_type TEXT,
  context_id UUID,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_checklist_items table
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  context_type TEXT NOT NULL,
  context_id UUID NOT NULL,
  uploaded_by UUID,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table for evaluation criteria
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  description TEXT,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  evaluation_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier_evaluations table
CREATE TABLE IF NOT EXISTS public.supplier_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  evaluation_type TEXT NOT NULL DEFAULT 'erp',
  target_id UUID,
  total_score NUMERIC,
  max_score NUMERIC,
  percentage_score NUMERIC,
  ranking INTEGER,
  notes TEXT,
  evaluated_by UUID,
  evaluated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluation_responses table
CREATE TABLE IF NOT EXISTS public.evaluation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.supplier_evaluations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  score NUMERIC,
  response_text TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, question_id)
);

-- Create contact_persons table
CREATE TABLE IF NOT EXISTS public.contact_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  department TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_interactions table
CREATE TABLE IF NOT EXISTS public.company_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subject TEXT,
  notes TEXT,
  user_id UUID,
  contact_person_id UUID REFERENCES public.contact_persons(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier_references table
CREATE TABLE IF NOT EXISTS public.supplier_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.supplier_evaluations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  project_description TEXT,
  satisfaction_rating INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_references ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Platform admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_platform_admin(auth.uid()));

-- Create RLS policies for opportunities
CREATE POLICY "Authenticated users can view opportunities" ON public.opportunities
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage opportunities" ON public.opportunities
  FOR ALL USING (true);

-- Create RLS policies for products
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Platform admins can manage products" ON public.products
  FOR ALL USING (public.is_platform_admin(auth.uid()));

-- Create RLS policies for opportunity_products
CREATE POLICY "Authenticated users can view opportunity products" ON public.opportunity_products
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage opportunity products" ON public.opportunity_products
  FOR ALL USING (true);

-- Create RLS policies for tasks
CREATE POLICY "Authenticated users can view tasks" ON public.tasks
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage tasks" ON public.tasks
  FOR ALL USING (true);

-- Create RLS policies for task_checklist_items
CREATE POLICY "Authenticated users can view checklist items" ON public.task_checklist_items
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage checklist items" ON public.task_checklist_items
  FOR ALL USING (true);

-- Create RLS policies for documents
CREATE POLICY "Authenticated users can view documents" ON public.documents
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage documents" ON public.documents
  FOR ALL USING (true);

-- Create RLS policies for questions
CREATE POLICY "Authenticated users can view active questions" ON public.questions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Platform admins can manage questions" ON public.questions
  FOR ALL USING (public.is_platform_admin(auth.uid()));

-- Create RLS policies for supplier_evaluations
CREATE POLICY "Authenticated users can view evaluations" ON public.supplier_evaluations
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage evaluations" ON public.supplier_evaluations
  FOR ALL USING (true);

-- Create RLS policies for evaluation_responses
CREATE POLICY "Authenticated users can view evaluation responses" ON public.evaluation_responses
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage evaluation responses" ON public.evaluation_responses
  FOR ALL USING (true);

-- Create RLS policies for contact_persons
CREATE POLICY "Authenticated users can view contact persons" ON public.contact_persons
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage contact persons" ON public.contact_persons
  FOR ALL USING (true);

-- Create RLS policies for company_interactions
CREATE POLICY "Authenticated users can view interactions" ON public.company_interactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage interactions" ON public.company_interactions
  FOR ALL USING (true);

-- Create RLS policies for supplier_references
CREATE POLICY "Authenticated users can view supplier references" ON public.supplier_references
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage supplier references" ON public.supplier_references
  FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON public.opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON public.opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON public.tasks(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_documents_context ON public.documents(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_project_id ON public.supplier_evaluations(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier_id ON public.supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contact_persons_company_id ON public.contact_persons(company_id);
CREATE INDEX IF NOT EXISTS idx_company_interactions_company_id ON public.company_interactions(company_id);