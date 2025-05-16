import { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle, Settings, Key, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UserSettings {
  theme: "light" | "dark" | "system";
  default_refresh_rate: number;
  auto_sync: boolean;
  notifications: {
    enabled: boolean;
    faction_attacks: boolean;
    bazaar_deals: boolean;
    company_events: boolean;
  };
  display: {
    compact_mode: boolean;
    show_ids: boolean;
    format_numbers: boolean;
  };
}

interface ApiKeyData {
  key: string;
  name: string;
  access_level: number;
  status: "valid" | "invalid" | "limited";
  usage: number;
  rate_limit: number;
  error?: string;
}

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testKeyResult, setTestKeyResult] = useState<ApiKeyData | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("api");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isPassVisible, setIsPassVisible] = useState(false);
  
  const { data: userSettings, isLoading: settingsLoading, isError: settingsError } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    enabled: !!user
  });
  
  const { data: apiKeyData, isLoading: apiKeyLoading, isError: apiKeyError } = useQuery<ApiKeyData>({
    queryKey: ["/api/settings/apikey"],
    enabled: !!user
  });
  
  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
    }
  }, [userSettings]);
  
  const saveApiKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await apiRequest("POST", "/api/settings/apikey", { key });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "API Key Saved",
        description: "Your Torn API key has been saved successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/apikey"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save API Key",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteApiKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/settings/apikey");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "API Key Removed",
        description: "Your Torn API key has been removed.",
        variant: "default",
      });
      setOpenDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/apikey"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Remove API Key",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: UserSettings) => {
      const res = await apiRequest("POST", "/api/settings", settings);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save Settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string, newPassword: string }) => {
      const res = await apiRequest("POST", "/api/user/password", { currentPassword, newPassword });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
        variant: "default",
      });
      // Reset form fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Password",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  
  const handleUpdatePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };
  
  const handleSettingChange = (key: string, value: any) => {
    if (!settings) return;
    
    const parts = key.split('.');
    if (parts.length === 1) {
      setSettings({
        ...settings,
        [key]: value,
      });
    } else if (parts.length === 2) {
      setSettings({
        ...settings,
        [parts[0]]: {
          ...settings[parts[0] as keyof UserSettings],
          [parts[1]]: value,
        },
      });
    }
  };
  
  const saveSettings = () => {
    if (settings) {
      updateSettingsMutation.mutate(settings);
    }
  };
  
  const testApiKey = async () => {
    if (!apiKey) {
      toast({
        title: "No API Key",
        description: "Please enter an API key to test.",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestingKey(true);
    setTestKeyResult(null);
    
    try {
      const res = await fetch("/api/settings/test-apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to test API key");
      }
      
      const data = await res.json();
      setTestKeyResult(data);
    } catch (error) {
      setTestKeyResult({
        key: apiKey,
        name: "Unknown",
        access_level: 0,
        status: "invalid",
        usage: 0,
        rate_limit: 0,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsTestingKey(false);
    }
  };
  
  const handleSaveApiKey = () => {
    if (!apiKey) {
      toast({
        title: "No API Key",
        description: "Please enter a valid API key.",
        variant: "destructive",
      });
      return;
    }
    
    saveApiKeyMutation.mutate(apiKey);
  };
  
  if (settingsLoading || apiKeyLoading) {
    return (
      <MainLayout title="Settings">
        <Helmet>
          <title>Settings | Byte-Core Vault</title>
          <meta name="description" content="Configure your Byte-Core Vault settings and API keys." />
        </Helmet>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading settings...</span>
        </div>
      </MainLayout>
    );
  }
  
  if ((settingsError || apiKeyError) && !user) {
    return (
      <MainLayout title="Settings">
        <Helmet>
          <title>Settings | Byte-Core Vault</title>
          <meta name="description" content="Configure your Byte-Core Vault settings and API keys." />
        </Helmet>
        <Card className="border-gray-700 bg-game-dark shadow-game">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-400 max-w-md mb-4">
              You need to be logged in to view and change settings.
            </p>
            <Button variant="default" onClick={() => window.location.href = "/auth"}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Settings">
      <Helmet>
        <title>Settings | Byte-Core Vault</title>
        <meta name="description" content="Configure your Byte-Core Vault settings and API keys." />
      </Helmet>
      
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-game-panel">
            <TabsTrigger value="api" className="flex items-center gap-1">
              <Key className="h-4 w-4" />
              <span>API Key</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Account</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Preferences</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="api">
          <Card className="border-gray-700 bg-game-dark shadow-game">
            <CardHeader>
              <CardTitle className="flex items-center gap-1">
                <Key className="h-5 w-5" />
                <span>Torn API Key Management</span>
              </CardTitle>
              <CardDescription>
                Configure your Torn API key to enable data fetching from the Torn API
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {apiKeyData && apiKeyData.key ? (
                <div>
                  <h3 className="text-lg font-medium mb-4">Current API Key</h3>
                  <div className="bg-game-panel rounded-lg p-4 border border-gray-700 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">API Key</span>
                      <span className="font-mono text-xs bg-gray-800 p-1 rounded">
                        {apiKeyData.key.slice(0, 6)}...{apiKeyData.key.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Name</span>
                      <span className="text-sm">{apiKeyData.name}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Access Level</span>
                      <span className="text-sm">{apiKeyData.access_level}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Status</span>
                      <span className={`text-sm ${
                        apiKeyData.status === 'valid' ? 'text-green-400' : 
                        apiKeyData.status === 'limited' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {apiKeyData.status.charAt(0).toUpperCase() + apiKeyData.status.slice(1)}
                      </span>
                    </div>
                    
                    {apiKeyData.status === 'invalid' && apiKeyData.error && (
                      <div className="mt-2 text-xs text-red-400">
                        Error: {apiKeyData.error}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">Remove API Key</Button>
                      </DialogTrigger>
                      <DialogContent className="bg-game-dark border border-gray-700">
                        <DialogHeader>
                          <DialogTitle>Remove API Key</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to remove your Torn API key? This will limit functionality until a new key is added.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => deleteApiKeyMutation.mutate()}
                            disabled={deleteApiKeyMutation.isPending}
                          >
                            {deleteApiKeyMutation.isPending ? "Removing..." : "Remove API Key"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium mb-4">Add Torn API Key</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="api-key"
                          placeholder="Enter your Torn API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="flex-1 bg-game-panel border-gray-700"
                        />
                        <Button 
                          variant="outline" 
                          onClick={testApiKey}
                          disabled={isTestingKey || !apiKey}
                        >
                          {isTestingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Create an API key: <a href="https://www.torn.com/preferences.php#tab=api&step=addNewKey&title=Byte-Core%20Vault&type=3" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Click here to generate a Byte-Core Vault API key</a>
                      </p>
                    </div>
                    
                    {testKeyResult && (
                      <div className={`p-3 rounded-md text-sm mt-2 ${
                        testKeyResult.status === 'valid' ? 'bg-green-900/20 text-green-400 border border-green-800' : 
                        testKeyResult.status === 'limited' ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800' : 
                        'bg-red-900/20 text-red-400 border border-red-800'
                      }`}>
                        {testKeyResult.status === 'valid' ? (
                          <div>
                            <p className="font-medium">✓ API Key Valid</p>
                            <p className="text-xs mt-1">Name: {testKeyResult.name} • Access Level: {testKeyResult.access_level}</p>
                          </div>
                        ) : testKeyResult.status === 'limited' ? (
                          <div>
                            <p className="font-medium">⚠ API Key Limited</p>
                            <p className="text-xs mt-1">This key has limited access (level {testKeyResult.access_level}). Some features may not work.</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">✕ API Key Invalid</p>
                            <p className="text-xs mt-1">{testKeyResult.error || "The API key could not be validated."}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <Button 
                        variant="default" 
                        onClick={handleSaveApiKey}
                        disabled={saveApiKeyMutation.isPending || (!testKeyResult?.status || testKeyResult.status === 'invalid')}
                        className="w-full"
                      >
                        {saveApiKeyMutation.isPending ? "Saving..." : "Save API Key"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">API Key Information</h3>
                <div className="space-y-4 text-sm text-gray-300">
                  <p>
                    <Shield className="h-4 w-4 inline-block mr-1 text-primary" />
                    Your API key is securely stored and used only for communicating with the Torn API.
                  </p>
                  <p>
                    <Shield className="h-4 w-4 inline-block mr-1 text-primary" />
                    We recommend using an API key with limited permissions based on the features you want to use.
                  </p>
                  <p>
                    <strong>Required Permissions:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Basic player information (for user stats)</li>
                    <li>Company details (for company tracking)</li>
                    <li>Faction information (for faction tracking)</li>
                    <li>Market data (for bazaar listings)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account">
          <Card className="border-gray-700 bg-game-dark shadow-game">
            <CardHeader>
              <CardTitle className="flex items-center gap-1">
                <User className="h-5 w-5" />
                <span>Account Settings</span>
              </CardTitle>
              <CardDescription>
                Manage your account details and security settings
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Account Information</h3>
                <div className="bg-game-panel rounded-lg p-4 border border-gray-700 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Username</span>
                    <span className="text-sm">{user?.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">ID</span>
                    <span className="text-sm">{user?.id}</span>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={isPassVisible ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                        className="bg-game-panel border-gray-700 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPassVisible(!isPassVisible)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
                      >
                        {isPassVisible ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                      className="bg-game-panel border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                      className="bg-game-panel border-gray-700"
                    />
                  </div>
                  <Button 
                    variant="default" 
                    onClick={handleUpdatePassword}
                    disabled={
                      updatePasswordMutation.isPending || 
                      !passwordData.currentPassword || 
                      !passwordData.newPassword || 
                      !passwordData.confirmPassword || 
                      passwordData.newPassword !== passwordData.confirmPassword
                    }
                  >
                    {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Danger Zone</h3>
                <div className="bg-red-900/20 rounded-lg p-4 border border-red-800 mb-4">
                  <h4 className="text-red-400 font-medium mb-2">Account Actions</h4>
                  <p className="text-sm text-gray-300 mb-4">
                    Be careful with these actions as they may result in data loss.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                    >
                      {logoutMutation.isPending ? "Logging out..." : "Logout"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences">
          {settings && (
            <Card className="border-gray-700 bg-game-dark shadow-game">
              <CardHeader>
                <CardTitle className="flex items-center gap-1">
                  <Settings className="h-5 w-5" />
                  <span>Preferences</span>
                </CardTitle>
                <CardDescription>
                  Customize your Byte-Core Vault experience
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Display Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="theme" className="text-base">Theme</Label>
                        <p className="text-sm text-gray-400">Choose your preferred theme</p>
                      </div>
                      <Select
                        value={settings.theme}
                        onValueChange={(value) => handleSettingChange('theme', value)}
                      >
                        <SelectTrigger className="w-[180px] bg-game-panel border-gray-700">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Compact Mode</Label>
                        <p className="text-sm text-gray-400">Reduce padding and spacing for more content</p>
                      </div>
                      <Switch
                        checked={settings.display.compact_mode}
                        onCheckedChange={(checked) => handleSettingChange('display.compact_mode', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Show IDs</Label>
                        <p className="text-sm text-gray-400">Display Torn IDs alongside names</p>
                      </div>
                      <Switch
                        checked={settings.display.show_ids}
                        onCheckedChange={(checked) => handleSettingChange('display.show_ids', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Format Numbers</Label>
                        <p className="text-sm text-gray-400">Use shortened format for large numbers (e.g., 1.5M)</p>
                      </div>
                      <Switch
                        checked={settings.display.format_numbers}
                        onCheckedChange={(checked) => handleSettingChange('display.format_numbers', checked)}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Data Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Auto-Sync Data</Label>
                        <p className="text-sm text-gray-400">Automatically refresh data in the background</p>
                      </div>
                      <Switch
                        checked={settings.auto_sync}
                        onCheckedChange={(checked) => handleSettingChange('auto_sync', checked)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="refresh-rate">Default Refresh Rate (minutes)</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="refresh-rate"
                          type="number"
                          min={1}
                          max={60}
                          value={settings.default_refresh_rate}
                          onChange={(e) => handleSettingChange('default_refresh_rate', parseInt(e.target.value))}
                          className="w-20 bg-game-panel border-gray-700"
                        />
                        <span className="text-sm text-gray-400">minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Enable Notifications</Label>
                        <p className="text-sm text-gray-400">Receive browser notifications for important events</p>
                      </div>
                      <Switch
                        checked={settings.notifications.enabled}
                        onCheckedChange={(checked) => handleSettingChange('notifications.enabled', checked)}
                      />
                    </div>
                    
                    <div className="space-y-2 pl-4 border-l-2 border-gray-700">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Faction Attacks</Label>
                        <Switch
                          checked={settings.notifications.faction_attacks}
                          onCheckedChange={(checked) => handleSettingChange('notifications.faction_attacks', checked)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Bazaar Deals</Label>
                        <Switch
                          checked={settings.notifications.bazaar_deals}
                          onCheckedChange={(checked) => handleSettingChange('notifications.bazaar_deals', checked)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Company Events</Label>
                        <Switch
                          checked={settings.notifications.company_events}
                          onCheckedChange={(checked) => handleSettingChange('notifications.company_events', checked)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-end">
                <Button 
                  variant="default" 
                  onClick={saveSettings}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
