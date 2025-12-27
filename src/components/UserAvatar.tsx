import { generateColorFromString } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  className?: string;
}

export const UserAvatar = ({ name, className }: UserAvatarProps) => {
  const initial = name.charAt(0).toUpperCase();
  const colorClass = generateColorFromString(name);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full text-white font-semibold",
        colorClass,
        className
      )}
    >
      {initial}
    </div>
  );
};
