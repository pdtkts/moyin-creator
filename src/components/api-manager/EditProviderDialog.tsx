// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Edit Provider Dialog
 * For editing existing API providers
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Shield, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { IProvider } from "@/lib/api-key-manager";
import { getApiKeyCount } from "@/lib/api-key-manager";

interface EditProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: IProvider | null;
  onSave: (provider: IProvider) => void;
  onTestConnection?: (provider: IProvider, model: string) => Promise<boolean>;
}

export function EditProviderDialog({
  open,
  onOpenChange,
  provider,
  onSave,
  onTestConnection,
}: EditProviderDialogProps) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [testModel, setTestModel] = useState("");
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Initialize form when provider changes
  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setBaseUrl(provider.baseUrl);
      setApiKey(provider.apiKey);
      // Load existing models
      setModel(provider.model?.join(', ') || '');
      // Load persisted testModel, validate it still exists in model list
      const savedTestModel = provider.testModel || '';
      setTestModel(provider.model?.includes(savedTestModel) ? savedTestModel : '');
      setTestResult(null);
    }
  }, [provider]);

  // Reset testModel if selected model removed from list
  useEffect(() => {
    const models = model.split(/[,\n]/).map(m => m.trim()).filter(m => m.length > 0);
    if (testModel && !models.includes(testModel)) {
      setTestModel('');
      setTestResult(null);
    }
  }, [model, testModel]);

  const handleTestConnection = async () => {
    if (!provider || !testModel || !onTestConnection) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      // Build current provider state from form fields for testing
      const currentProvider: IProvider = {
        ...provider,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
      };
      const success = await onTestConnection(currentProvider, testModel);
      setTestResult(success);
    } catch {
      setTestResult(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!provider) return;

    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    // Parse model list (comma or newline separated)
    const models = model
      .split(/[,\n]/)
      .map(m => m.trim())
      .filter(m => m.length > 0);

    onSave({
      ...provider,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: models,
      testModel: testModel || undefined,
    });

    onOpenChange(false);
    toast.success("Changes saved");
  };

  const keyCount = getApiKeyCount(apiKey);

  // Compute model list from current text input for dropdown (deduplicated)
  const currentModels = [...new Set(
    model.split(/[,\n]/).map(m => m.trim()).filter(m => m.length > 0)
  )];

  const hasBaseUrl = !!baseUrl.trim();
  const hasKeys = keyCount > 0;
  const canTest = !!testModel && hasBaseUrl && hasKeys && currentModels.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Provider</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Platform (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Platform</Label>
            <Input value={provider?.platform || ""} disabled className="bg-muted" />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Provider Name"
            />
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </div>

          {/* API Keys */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>API Keys</Label>
              <span className="text-xs text-muted-foreground">
                {keyCount} Keys
              </span>
            </div>
            <Textarea
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API Keys (one per line, or comma-separated)"
              className="font-mono text-sm min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              💡 Supports multiple keys rotation, automatically switches to the next one on failure
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label>Models</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Enter model names, e.g., deepseek-v3"
            />
            <p className="text-xs text-muted-foreground">
              Multiple models separated by commas, first one is default
            </p>
          </div>

          {/* Test Connection */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Test Connection</Label>
            <div className="flex items-center gap-2">
              <Select
                value={testModel}
                onValueChange={(value) => {
                  setTestModel(value);
                  setTestResult(null);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select model to test..." />
                </SelectTrigger>
                <SelectContent>
                  {currentModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={!canTest || isTesting}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : testResult === true ? (
                  <Check className="h-4 w-4 text-green-500 mr-1" />
                ) : testResult === false ? (
                  <X className="h-4 w-4 text-red-500 mr-1" />
                ) : (
                  <Shield className="h-4 w-4 mr-1" />
                )}
                Test
              </Button>
            </div>

            {!hasBaseUrl && (
              <p className="text-xs text-muted-foreground">
                Base URL required for connection test
              </p>
            )}
            {currentModels.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add models above to enable testing
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
