import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export type TechCategory =
  | "core_language"
  | "frontend_framework"
  | "backend_framework"
  | "external_service"
  | "dev_tool"
  | "third_party_api";

export interface TechStackEntry {
  id: number;
  category: TechCategory;
  name: string;
  // Core Language fields
  version?: string;
  type_system?: string;
  // Frontend Framework fields
  state_management?: string;
  styling_approach?: string;
  // Backend Framework fields
  orm?: string;
  // External Service fields
  provider?: string;
  purpose?: string;
  // Dev Tool fields
  tool_category?: string;
  // Third-Party API fields
  authentication_method?: string;
}

interface AddTechStackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<TechStackEntry, "id">) => void;
}

const CATEGORY_LABELS: Record<TechCategory, string> = {
  core_language: "Core Language",
  frontend_framework: "Frontend Framework",
  backend_framework: "Backend Framework",
  external_service: "External Service",
  dev_tool: "Dev Tool",
  third_party_api: "Third-Party API",
};

export const AddTechStackModal = ({
  isOpen,
  onClose,
  onSave,
}: AddTechStackModalProps) => {
  const [category, setCategory] = useState<TechCategory>("core_language");
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [typeSystem, setTypeSystem] = useState("");
  const [stateManagement, setStateManagement] = useState("");
  const [stylingApproach, setStylingApproach] = useState("");
  const [orm, setOrm] = useState("");
  const [provider, setProvider] = useState("");
  const [purpose, setPurpose] = useState("");
  const [toolCategory, setToolCategory] = useState("");
  const [authenticationMethod, setAuthenticationMethod] = useState("");

  useEffect(() => {
    if (!isOpen) {
      // Reset all fields when dialog closes
      setCategory("core_language");
      setName("");
      setVersion("");
      setTypeSystem("");
      setStateManagement("");
      setStylingApproach("");
      setOrm("");
      setProvider("");
      setPurpose("");
      setToolCategory("");
      setAuthenticationMethod("");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }

    const baseData = {
      category,
      name: name.trim(),
    };

    let additionalData = {};

    switch (category) {
      case "core_language":
        additionalData = {
          version: version.trim() || undefined,
          type_system: typeSystem.trim() || undefined,
        };
        break;
      case "frontend_framework":
        additionalData = {
          version: version.trim() || undefined,
          state_management: stateManagement.trim() || undefined,
          styling_approach: stylingApproach.trim() || undefined,
        };
        break;
      case "backend_framework":
        additionalData = {
          version: version.trim() || undefined,
          orm: orm.trim() || undefined,
        };
        break;
      case "external_service":
        additionalData = {
          provider: provider.trim(),
          purpose: purpose.trim(),
        };
        break;
      case "dev_tool":
        additionalData = {
          tool_category: toolCategory.trim(),
          purpose: purpose.trim() || undefined,
        };
        break;
      case "third_party_api":
        additionalData = {
          provider: provider.trim(),
          purpose: purpose.trim(),
          authentication_method: authenticationMethod.trim() || undefined,
        };
        break;
    }

    onSave({ ...baseData, ...additionalData });
    onClose();
  };

  const renderCategoryFields = () => {
    switch (category) {
      case "core_language":
        return (
          <>
            <div className="grid w-full gap-2">
              <Label htmlFor="version">Version (optional)</Label>
              <Input
                id="version"
                placeholder="e.g., 3.11, 18.x, 1.21"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="type-system">Type System (optional)</Label>
              <Input
                id="type-system"
                placeholder="e.g., Static, Dynamic, Gradual"
                value={typeSystem}
                onChange={(e) => setTypeSystem(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
          </>
        );

      case "frontend_framework":
        return (
          <>
            <div className="grid w-full gap-2">
              <Label htmlFor="version">Version (optional)</Label>
              <Input
                id="version"
                placeholder="e.g., 18.x, 14.x, 4.x"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="state-management">State Management (optional)</Label>
              <Input
                id="state-management"
                placeholder="e.g., Redux, Zustand, Context API"
                value={stateManagement}
                onChange={(e) => setStateManagement(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="styling-approach">Styling Approach (optional)</Label>
              <Input
                id="styling-approach"
                placeholder="e.g., TailwindCSS, Styled Components, CSS Modules"
                value={stylingApproach}
                onChange={(e) => setStylingApproach(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
          </>
        );

      case "backend_framework":
        return (
          <>
            <div className="grid w-full gap-2">
              <Label htmlFor="version">Version (optional)</Label>
              <Input
                id="version"
                placeholder="e.g., 5.x, 4.x, 2.x"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="orm">ORM (optional)</Label>
              <Input
                id="orm"
                placeholder="e.g., Prisma, TypeORM, Sequelize"
                value={orm}
                onChange={(e) => setOrm(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
          </>
        );

      case "external_service":
        return (
          <>
            <div className="grid w-full gap-2">
              <Label htmlFor="provider">Provider *</Label>
              <Input
                id="provider"
                placeholder="e.g., AWS, Google Cloud, Vercel"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Input
                id="purpose"
                placeholder="e.g., Database hosting, Authentication, CDN"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
          </>
        );

      case "dev_tool":
        return (
          <>
            <div className="grid w-full gap-2">
              <Label htmlFor="tool-category">Category *</Label>
              <Select value={toolCategory} onValueChange={setToolCategory}>
                <SelectTrigger className="bg-slate-800 border-slate-700 focus:ring-blue-500">
                  <SelectValue placeholder="Select tool category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="linting">Linting</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="ci-cd">CI/CD</SelectItem>
                  <SelectItem value="bundler">Bundler</SelectItem>
                  <SelectItem value="package-manager">Package Manager</SelectItem>
                  <SelectItem value="version-control">Version Control</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="purpose">Purpose (optional)</Label>
              <Input
                id="purpose"
                placeholder="e.g., Code quality, Unit testing, Deployment"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
          </>
        );

      case "third_party_api":
        return (
          <>
            <div className="grid w-full gap-2">
              <Label htmlFor="provider">Provider *</Label>
              <Input
                id="provider"
                placeholder="e.g., Stripe, Twilio, SendGrid"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Input
                id="purpose"
                placeholder="e.g., Payment processing, SMS, Email delivery"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
            <div className="grid w-full gap-2">
              <Label htmlFor="authentication-method">Authentication Method (optional)</Label>
              <Input
                id="authentication-method"
                placeholder="e.g., API Key, OAuth 2.0, Bearer Token"
                value={authenticationMethod}
                onChange={(e) => setAuthenticationMethod(e.target.value)}
                className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const isFormValid = () => {
    if (!name.trim()) return false;

    switch (category) {
      case "external_service":
        return provider.trim() !== "" && purpose.trim() !== "";
      case "dev_tool":
        return toolCategory.trim() !== "";
      case "third_party_api":
        return provider.trim() !== "" && purpose.trim() !== "";
      default:
        return true;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Tech Stack</DialogTitle>
        </DialogHeader>
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="grid gap-6 py-4">
          {/* Category Selection */}
          <div className="grid w-full gap-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={(val) => setCategory(val as TechCategory)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name Field (common to all categories) */}
          <div className="grid w-full gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder={`Enter ${CATEGORY_LABELS[category].toLowerCase()} name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Conditional Fields Based on Category */}
          {renderCategoryFields()}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isFormValid()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Tech Stack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
