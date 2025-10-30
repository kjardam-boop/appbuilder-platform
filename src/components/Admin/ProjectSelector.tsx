import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectsForAdmin } from "@/hooks/useProjectsForAdmin";

interface ProjectSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const ProjectSelector = ({ value, onValueChange, placeholder = "Velg prosjekt..." }: ProjectSelectorProps) => {
  const { data: projects, isLoading } = useProjectsForAdmin();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laster prosjekter...</div>;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {projects?.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
