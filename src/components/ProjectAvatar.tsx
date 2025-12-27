import { generateColorFromString } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProjectAvatarProps {
  projectId: string;
  projectName: string;
  className?: string;
}

export const ProjectAvatar = ({
  projectId,
  projectName,
  className,
}: ProjectAvatarProps) => {
  const initial = projectName.charAt(0).toUpperCase();
  const colorClass = generateColorFromString(projectId);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg text-white font-semibold",
        colorClass,
        className
      )}
    >
      {initial}
    </div>
  );
};
