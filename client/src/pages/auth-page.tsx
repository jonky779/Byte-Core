import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Helmet } from "react-helmet";

const loginSchema = z.object({
  apiKey: z.string().min(16, "Torn API Key should be 16 characters"),
  rememberMe: z.boolean().optional().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation } = useAuth();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      apiKey: "",
      rememberMe: true,
    },
  });
  
  // Check local storage for saved API key to prevent duplicate registrations
  useEffect(() => {
    const savedApiKey = localStorage.getItem('byte_core_api_key');
    if (savedApiKey) {
      loginForm.setValue('apiKey', savedApiKey);
      loginForm.setValue('rememberMe', true);
    }
  }, []);

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  // Toggle theme function
  const toggleTheme = () => {
    const theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', theme);
  };

  if (user) {
    // This is a backup check in case the useEffect hasn't triggered yet
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Sign In | Byte-Core Vault</title>
        <meta name="description" content="Access comprehensive Torn RPG information and tracking tools with Byte-Core Vault." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col md:flex-row bg-background">
        {/* Hero Section */}
        <div className="hidden md:flex md:w-1/2 bg-card flex-col justify-center items-center px-8 border-r border-border">
          <div className="max-w-md text-center">
            <div className="mb-6 inline-block">
              <div className="w-20 h-20 flex items-center justify-center rounded-lg bg-primary bg-opacity-30 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-primary-light">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
              </div>
            </div>
            <h1 className="font-bold text-4xl mb-2 tracking-wide bg-gradient-to-r from-primary-light to-primary text-transparent bg-clip-text">BYTE-CORE VAULT</h1>
            <h2 className="text-lg text-foreground mb-6">Your Ultimate Torn RPG Dashboard</h2>
            <div className="space-y-4 mb-8 text-left text-foreground">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Track player stats, companies, and factions in real-time</span>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Find the best deals on bazaar with smart item tracking</span>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Search for potential employees and faction members</span>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Comprehensive crawler for gathering player data</span>
              </div>
            </div>
          </div>
        </div>
      
        {/* Auth Form Section */}
        <div className="flex-1 flex flex-col justify-center items-center p-4 md:p-8 bg-background">
          <div className="w-full max-w-md">
            <div className="flex justify-between items-center mb-8">
              {/* Mobile Logo */}
              <div className="md:hidden">
                <h1 className="font-bold text-2xl tracking-wide bg-gradient-to-r from-primary-light to-primary text-transparent bg-clip-text">BYTE-CORE VAULT</h1>
                <p className="text-sm text-muted-foreground">Your Ultimate Torn RPG Dashboard</p>
              </div>
              
              {/* Theme Toggle Button */}
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleTheme}
                className="ml-auto rounded-full"
              >
                {/* Sun icon for dark mode (shows in dark mode) */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden dark:block">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                {/* Moon icon for light mode (shows in light mode) */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block dark:hidden">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              </Button>
            </div>
              
            <Card className="border-border bg-card backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">Sign in to Byte-Core Vault</CardTitle>
                <CardDescription className="text-muted-foreground">Enter your Torn API key to access your dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Torn API Key</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your Torn API key" 
                              {...field} 
                              type="text"
                              className="bg-muted border-input"
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground mt-1">
                            <a href="https://www.torn.com/preferences.php#tab=api&step=addNewKey&title=Byte-Core%20Vault&type=3" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Generate a Torn API key here</a>
                          </p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              id="rememberMe"
                              className="data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          <div className="leading-none">
                            <FormLabel className="text-sm">Remember me</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary-dark mt-4"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  <p>First time users: Your account will be created automatically when you sign in</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
