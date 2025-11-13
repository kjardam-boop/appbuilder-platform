import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Edit, Trash2, Eye, Search, FileText } from 'lucide-react';

interface ContentItem {
  id: string;
  tenant_id: string | null;
  category: string;
  title: string;
  content_markdown: string;
  keywords: string[];
  file_type: string;
  file_size_bytes: number | null;
  original_filename: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ContentLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch content library
  const { data: contentItems, isLoading } = useQuery({
    queryKey: ['content-library', searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('ai_app_content_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content_markdown.ilike.%${searchQuery}%`);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContentItem[];
    },
  });

  // Fetch tenants for assignment dropdown
  const { data: tenants } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_app_content_library')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-library'] });
      toast.success('Content deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete content: ' + error.message);
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this content?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const categories = [
    'onboarding',
    'faq',
    'help',
    'integration',
    'product',
    'guide',
    'tutorial',
    'general',
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            AI Content Library
          </CardTitle>
          <CardDescription>
            Manage markdown content for AI-generated experiences. Upload files, edit content, and assign to tenants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Content
            </Button>
          </div>

          {/* Content Table */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentItems && contentItems.length > 0 ? (
                    contentItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.tenant_id ? (
                            <Badge variant="secondary">
                              {tenants?.find((t) => t.id === item.tenant_id)?.name || item.tenant_id}
                            </Badge>
                          ) : (
                            <Badge>Platform</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.keywords?.slice(0, 3).map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {item.keywords?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.keywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.is_active ? (
                            <Badge variant="default" className="bg-green-500">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No content found. Upload your first markdown file to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <UploadContentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        categories={categories}
        tenants={tenants || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['content-library'] });
          setShowUploadDialog(false);
        }}
      />

      {/* Edit Dialog */}
      {editingItem && (
        <EditContentDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          item={editingItem}
          categories={categories}
          tenants={tenants || []}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['content-library'] });
            setShowEditDialog(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Upload Dialog Component
function UploadContentDialog({ 
  open, 
  onOpenChange, 
  categories, 
  tenants, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  categories: string[];
  tenants: any[];
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [tenantId, setTenantId] = useState<string>('platform');
  const [keywords, setKeywords] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.md')) {
        toast.error('Only .md files are supported currently');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace('.md', ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      toast.error('Please select a file and provide a title');
      return;
    }

    setUploading(true);
    try {
      // Read file content
      const content = await file.text();

      // Insert into database
      const { error } = await supabase.from('ai_app_content_library').insert({
        tenant_id: tenantId === 'platform' ? null : tenantId,
        category,
        title,
        content_markdown: content,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        file_type: 'markdown',
        file_size_bytes: file.size,
        original_filename: file.name,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Content uploaded successfully!');
      setFile(null);
      setTitle('');
      setKeywords('');
      onSuccess();
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Content</DialogTitle>
          <DialogDescription>
            Upload a markdown file to the content library. It will be used by AI to generate experiences.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>File (.md only)</Label>
            <Input type="file" accept=".md" onChange={handleFileChange} />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., How to connect Tripletex"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform (all tenants)</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Keywords (comma-separated)</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., integration, tripletex, erp, connect"
            />
            <p className="text-xs text-muted-foreground">
              Help AI find this content by adding relevant search keywords
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !title}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Dialog Component
function EditContentDialog({
  open,
  onOpenChange,
  item,
  categories,
  tenants,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ContentItem;
  categories: string[];
  tenants: any[];
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState(item.category);
  const [content, setContent] = useState(item.content_markdown);
  const [keywords, setKeywords] = useState(item.keywords?.join(', ') || '');
  const [tenantId, setTenantId] = useState(item.tenant_id || 'platform');
  const [isActive, setIsActive] = useState(item.is_active);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_app_content_library')
        .update({
          title,
          category,
          content_markdown: content,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          tenant_id: tenantId === 'platform' ? null : tenantId,
          is_active: isActive,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Content updated successfully!');
      onSuccess();
    } catch (error: any) {
      toast.error('Save failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
          <DialogDescription>Update content details and markdown</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform (all tenants)</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Keywords (comma-separated)</Label>
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Markdown Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is-active" className="cursor-pointer">
              Active (visible to AI)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
