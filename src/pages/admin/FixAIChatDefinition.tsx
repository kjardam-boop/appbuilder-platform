import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function FixAIChatDefinition() {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'exists' | 'missing' | 'error'>('idle');
  const [recordData, setRecordData] = useState<any>(null);

  const checkRecord = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('app_definitions')
        .select('*')
        .eq('key', 'ai-chat')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStatus('exists');
        setRecordData(data);
        toast.success('AI Chat definition exists!');
      } else {
        setStatus('missing');
        setRecordData(null);
        toast.warning('AI Chat definition is missing');
      }
    } catch (error) {
      console.error('Check error:', error);
      setStatus('error');
      toast.error('Error checking database');
    } finally {
      setIsChecking(false);
    }
  };

  const fixRecord = async () => {
    setIsFixing(true);
    try {
      // Call the edge function to create the definition
      // This uses service_role key to bypass RLS
      const { data: result, error } = await supabase.functions.invoke(
        'create-ai-chat-definition',
        {
          body: {}
        }
      );

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error || 'Failed to create definition');
      }

      // Refresh the check to get the newly created record
      await checkRecord();
      
      toast.success(result.message || 'AI Chat definition created successfully!');
    } catch (error: any) {
      console.error('Fix error:', error);
      toast.error('Failed to create record', {
        description: error.message
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Fix AI Chat Definition</CardTitle>
          <CardDescription>
            Check if the AI Chat app definition exists in the database and fix it if needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">Status</div>
              {status === 'idle' && (
                <Badge variant="secondary">Not Checked</Badge>
              )}
              {status === 'exists' && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Record Exists
                </Badge>
              )}
              {status === 'missing' && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Record Missing
                </Badge>
              )}
              {status === 'error' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Error
                </Badge>
              )}
            </div>
            <Button
              onClick={checkRecord}
              disabled={isChecking}
              variant="outline"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Database'
              )}
            </Button>
          </div>

          {/* Record Details */}
          {recordData && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium">Record Details</div>
              <div className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                <pre>{JSON.stringify(recordData, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Fix Button */}
          {status === 'missing' && (
            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    AI Chat definition is missing
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    The migration didn't create the record. Click the button below to create it manually.
                  </p>
                  <Button
                    onClick={fixRecord}
                    disabled={isFixing}
                    className="mt-3"
                  >
                    {isFixing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Record'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {status === 'exists' && (
            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">
                    AI Chat definition exists
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    The app definition is properly configured. You can now activate AI Chat for tenants.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
