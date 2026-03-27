import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";

const taskSchema = z.object({
  project_id: z.string().min(1, "Energy Program is required"),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  status: z.string().default("To Do"),
  priority: z.string().default("Medium"),
  task_type: z.string().optional(),
  assigned_to_user_id: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  projectId?: string;
  task?: any;
}

export function TaskForm({ open, onClose, onSubmit, isSubmitting, projectId, task }: TaskFormProps) {
  const { tenantId } = useEffectiveUser();
  
  const { data: users } = useQuery({
    queryKey: ["tenant-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tenant_users");
      if (error) throw error;
      return data;
    },
  });

  const { projects } = useProjects();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      project_id: projectId || "",
      name: "",
      description: "",
      status: "To Do",
      priority: "Medium",
      task_type: "",
      assigned_to_user_id: "",
      start_date: "",
      due_date: "",
      progress: 0,
    },
  });

  useEffect(() => {
    if (task && open) {
      form.reset({
        project_id: task.project_id || projectId || "",
        name: task.name || "",
        description: task.description || "",
        status: task.status || "To Do",
        priority: task.priority || "Medium",
        task_type: task.task_type || "",
        assigned_to_user_id: task.assigned_to_user_id || "",
        start_date: task.start_date || "",
        due_date: task.due_date || "",
        progress: task.progress || 0,
      });
    } else if (!open) {
      form.reset({
        project_id: projectId || "",
        name: "",
        description: "",
        status: "To Do",
        priority: "Medium",
        task_type: "",
        assigned_to_user_id: "",
        start_date: "",
        due_date: "",
        progress: 0,
      });
    }
  }, [task, open, form, projectId]);

  const handleSubmit = (data: TaskFormData) => {
    const submitData = {
      ...(task?.task_id && { task_id: task.task_id }),
      tenant_id: tenantId,
      project_id: data.project_id,
      name: data.name,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      task_type: data.task_type || null,
      assigned_to_user_id: data.assigned_to_user_id || null,
      start_date: data.start_date || null,
      due_date: data.due_date || null,
      progress: data.progress,
    };
    onSubmit(submitData);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy Program *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select energy program" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.project_id} value={project.project_id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Implement user authentication" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the task details..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="task_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select task type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Posting">Posting</SelectItem>
                      <SelectItem value="Heading">Heading</SelectItem>
                      <SelectItem value="Total">Total</SelectItem>
                      <SelectItem value="Begin-Total">Begin-Total</SelectItem>
                      <SelectItem value="End-Total">End-Total</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : task ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
