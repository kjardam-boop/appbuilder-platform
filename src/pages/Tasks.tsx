import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, FilterX, Settings, Building2, Briefcase, TrendingUp, User, ExternalLink, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import Header from '@/components/Dashboard/Header';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTable } from '@/hooks/useDataTable';
import { ColumnDef } from '@/components/DataTable/types';
import {
  Task,
  TaskCategory,
  TaskDialog,
  TaskStatusBadge,
  TaskPriorityBadge,
  TaskService,
  ReassignTaskDialog,
 } from '@/modules/tasks';
import type { EntityType } from '@/modules/tasks/types/tasks.types';
import { TaskEditDialog } from '@/modules/tasks/components/TaskEditDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface TaskWithDetails extends Task {
  category?: TaskCategory;
  assigned_user?: Profile;
  created_user?: Profile;
  entity_name?: string;
  checklist_items?: any[];
}

const entityIcons = {
  company: Building2,
  project: Briefcase,
  opportunity: TrendingUp,
  user: User,
};

const entityLabels = {
  company: 'Selskap',
  project: 'Prosjekt',
  opportunity: 'Mulighet',
  user: 'Bruker',
};

const Tasks = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [reassignTask, setReassignTask] = useState<TaskWithDetails | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<TaskCategory[]>([]);

  // Get filter from URL params
  const entityIdFromUrl = searchParams.get('entity_id');
  const entityTypeFromUrl = searchParams.get('entity_type');

  const getContextLink = (task: TaskWithDetails): string | null => {
    const contextTag = task.tags?.find((tag) => tag.startsWith('context:'));
    if (!contextTag) return null;

    const context = contextTag.replace('context:', '');

    if (task.entity_type === 'project') {
      return `/dashboard/project/${task.entity_id}#${context}`;
    }
    if (task.entity_type === 'company') {
      return `/company/${task.entity_id}`;
    }

    return null;
  };

  const defaultColumns: ColumnDef<TaskWithDetails>[] = useMemo(() => [
    {
      key: 'title',
      label: 'Tittel',
      type: 'text',
      visible: true,
      sortable: true,
      filterable: true,
      sticky: 'left',
      width: 250,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingTask(row);
            }}
            className="truncate font-medium hover:underline text-foreground text-left"
            title="Åpne og rediger oppgave"
          >
            {value}
          </button>
          {getContextLink(row) && (
            <a
              href={getContextLink(row)!}
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:underline flex-shrink-0"
              title="Gå til kilde"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      visible: true,
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => <TaskStatusBadge status={value} />,
      filterOptions: [
        { value: 'todo', label: 'Gjøres' },
        { value: 'in_progress', label: 'Pågår' },
        { value: 'blocked', label: 'Blokkert' },
        { value: 'completed', label: 'Fullført' },
        { value: 'cancelled', label: 'Avbrutt' },
      ],
    },
    {
      key: 'priority',
      label: 'Prioritet',
      type: 'select',
      visible: true,
      sortable: true,
      filterable: true,
      width: 100,
      render: (value) => <TaskPriorityBadge priority={value} />,
      filterOptions: [
        { value: 'low', label: 'Lav' },
        { value: 'medium', label: 'Middels' },
        { value: 'high', label: 'Høy' },
        { value: 'urgent', label: 'Haster' },
      ],
    },
    {
      key: 'entity_type',
      label: 'Type',
      type: 'select',
      visible: true,
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => {
        const Icon = entityIcons[value as keyof typeof entityIcons];
        return (
          <Badge variant="outline" className="gap-1">
            <Icon className="h-3 w-3" />
            {entityLabels[value as keyof typeof entityLabels]}
          </Badge>
        );
      },
      filterOptions: [
        { value: 'company', label: 'Selskap' },
        { value: 'project', label: 'Prosjekt' },
        { value: 'opportunity', label: 'Mulighet' },
        { value: 'user', label: 'Bruker' },
      ],
    },
    {
      key: 'entity_name',
      label: 'Relatert til',
      type: 'text',
      visible: true,
      sortable: true,
      filterable: true,
      width: 200,
      render: (value) => <span className="truncate">{value || '-'}</span>,
    },
    {
      key: 'assigned_to',
      label: 'Tildelt',
      type: 'text',
      visible: true,
      sortable: true,
      filterable: true,
      width: 150,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{row.assigned_user?.full_name || '-'}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setReassignTask(row);
            }}
            title="Tildel til annen bruker"
          >
            <UserCog className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      key: 'due_date',
      label: 'Frist',
      type: 'date',
      visible: true,
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, row) => {
        if (!value) return '-';
        const date = new Date(value);
        const isOverdue = date < new Date() && row.status !== 'completed';
        return (
          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
            {format(date, 'dd.MM.yyyy', { locale: nb })}
          </span>
        );
      },
    },
    {
      key: 'completion_percentage',
      label: 'Fremdrift',
      type: 'number',
      visible: true,
      sortable: true,
      filterable: false,
      width: 150,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Progress value={value || 0} className="w-16" />
          <span className="text-sm text-muted-foreground">{value || 0}%</span>
        </div>
      ),
    },
    {
      key: 'category_id',
      label: 'Kategori',
      type: 'text',
      visible: true,
      sortable: true,
      filterable: true,
      width: 150,
      render: (_, row) => {
        if (!row.category?.name) return <span className="text-muted-foreground">-</span>;
        return <Badge variant="outline">{row.category.name}</Badge>;
      },
    },
    {
      key: 'context_section',
      label: 'Kontekst',
      type: 'text',
      visible: true,
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => {
        if (!value) return <span className="text-muted-foreground">-</span>;
        return <Badge variant="outline">{value}</Badge>;
      },
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'custom',
      visible: true,
      filterable: false,
      width: 200,
      render: (value: string[]) => {
        const visibleTags = value?.filter((tag) => !tag.startsWith('context:')) || [];
        if (visibleTags.length === 0) return '-';
        const displayTags = visibleTags.slice(0, 2);
        const remaining = visibleTags.length - 2;
        return (
          <div className="flex gap-1 flex-wrap">
            {displayTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remaining}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Opprettet',
      type: 'date',
      visible: false,
      sortable: true,
      filterable: true,
      width: 140,
      render: (value) => format(new Date(value), 'dd.MM.yyyy HH:mm', { locale: nb }),
    },
    {
      key: 'updated_at',
      label: 'Sist oppdatert',
      type: 'date',
      visible: true,
      sortable: true,
      filterable: true,
      width: 140,
      render: (value) => format(new Date(value), 'dd.MM.yyyy HH:mm', { locale: nb }),
    },
  ], [categories]);

  const {
    columns,
    sortConfig,
    filterConfig,
    processedData,
    handleSort,
    handleFilterChange,
    toggleColumn,
    reorderColumns,
    resetColumns,
    clearFilters,
  } = useDataTable({
    data: tasks,
    defaultColumns,
    tableKey: 'tasks-list',
    configVersion: 2, // Bump version to refresh config
  });

  const totalPages = Math.ceil(processedData.length / pageSize);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    fetchProfile();
    fetchCategories();
    fetchTasks();
  };

  const fetchCategories = async () => {
    try {
      const cats = await TaskService.getCategories();
      setCategories(cats);
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
  };

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select(
          `
          *,
          category:task_categories(*),
          assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, email),
          created_user:profiles!tasks_created_by_fkey(id, full_name, email),
          checklist_items:task_checklist_items(id, is_completed)
        `
        );

      // Apply filters from URL if present
      if (entityIdFromUrl && entityTypeFromUrl) {
        const validTypes: EntityType[] = ['company', 'project', 'opportunity', 'user'];
        if (validTypes.includes(entityTypeFromUrl as EntityType)) {
          query = query
            .eq('entity_type', entityTypeFromUrl as EntityType)
            .eq('entity_id', entityIdFromUrl);
        }
      }

      const { data: tasksData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch entity names
      const entityMap = await fetchEntityNames(tasksData || []);

      const tasksWithDetails = (tasksData || []).map((task) => ({
        ...task,
        entity_name: entityMap.get(`${task.entity_type}:${task.entity_id}`),
      }));

      setTasks(tasksWithDetails);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Kunne ikke laste oppgaver');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityNames = async (tasks: Task[]): Promise<Map<string, string>> => {
    const map = new Map<string, string>();

    const byType: Record<string, string[]> = {};
    
    tasks.forEach((task) => {
      if (!byType[task.entity_type]) {
        byType[task.entity_type] = [];
      }
      byType[task.entity_type].push(task.entity_id);
    });

    const promises = Object.entries(byType).map(async ([type, ids]) => {
      let table: string | null = null;
      let nameField: string | null = null;

      switch (type) {
        case 'company':
          table = 'companies';
          nameField = 'name';
          break;
        case 'project':
          table = 'projects';
          nameField = 'title';
          break;
        case 'opportunity':
          table = 'opportunities';
          nameField = 'title';
          break;
        case 'user':
          table = 'profiles';
          nameField = 'full_name';
          break;
        default:
          return;
      }

      if (!table || !nameField) return;

      const { data } = await supabase
        .from(table as 'companies' | 'projects' | 'opportunities' | 'profiles')
        .select(`id, ${nameField}`)
        .in('id', ids);

      data?.forEach((item: any) => {
        map.set(`${type}:${item.id}`, item[nameField]);
      });
    });

    await Promise.all(promises);
    return map;
  };

  const handleRowClick = (task: TaskWithDetails) => {
    // TODO: Open task details dialog
    console.log('Open task:', task);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userName={profile?.full_name} userEmail={profile?.email} />
      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[600px] w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userEmail={profile?.email} />

      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <AppBreadcrumbs customLabel="Oppgaver" />

        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Oppgaver</h1>
              {entityIdFromUrl && entityTypeFromUrl && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Filtrert på {entityLabels[entityTypeFromUrl as keyof typeof entityLabels]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/tasks')}
                  >
                    Fjern filter
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowTaskDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ny oppgave
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                <FilterX className="h-4 w-4 mr-2" />
                Nullstill filtre
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Kolonner
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {columns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={col.visible}
                      onCheckedChange={() => toggleColumn(col.key)}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetColumns}>Tilbakestill standard</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={processedData}
            onSort={handleSort}
            onFilterChange={handleFilterChange}
            onReorderColumns={reorderColumns}
            sortConfig={sortConfig}
            filterConfig={filterConfig}
            pageSize={pageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onRowClick={handleRowClick}
          />
        </div>
      </main>

      <TaskDialog 
        open={showTaskDialog} 
        onOpenChange={setShowTaskDialog} 
        entityType="user"
        entityId={profile?.id || ''}
        onTaskCreated={fetchTasks}
      />

      <TaskEditDialog
        open={!!editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onUpdated={fetchTasks}
      />

      {reassignTask && (
        <ReassignTaskDialog
          open={!!reassignTask}
          onOpenChange={(open) => {
            if (!open) setReassignTask(null);
          }}
          task={reassignTask}
          onReassigned={fetchTasks}
        />
      )}
    </div>
  );
};

export default Tasks;
