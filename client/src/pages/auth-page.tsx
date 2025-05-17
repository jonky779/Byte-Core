import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Helmet } from "react-helmet";

const loginSchema = z.object({
  apiKey: z.string().min(16, "Torn API Key should be 16 characters"),
  rememberMe: z.boolean().optional().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation } = useAuth();
  const [showTosModal, setShowTosModal] = useState(false);

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
        {/* Hero Section - Desktop only */}
        <div className="hidden md:flex md:w-1/2 bg-card flex-col justify-center items-center px-8 border-r border-border">
          <div className="max-w-md text-center">
            <div className="mb-6 inline-block">
              <div className="w-24 h-24 relative mx-auto">
                {/* Animated outer ring */}
                <div className="absolute inset-0 bg-blue-500 rounded-2xl animate-pulse opacity-20"></div>
                {/* Logo background */}
                <div className="absolute inset-1 bg-background dark:bg-gray-800 rounded-xl"></div>
                {/* Logo content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-500">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  </svg>
                </div>
              </div>
            </div>
            <h1 className="font-bold text-4xl mb-2 tracking-wide bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text">BYTE-CORE VAULT</h1>
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
              <div className="md:hidden flex items-center">
                <div className="w-12 h-12 relative mr-3">
                  {/* Animated outer ring */}
                  <div className="absolute inset-0 bg-blue-500 rounded-xl animate-pulse opacity-20"></div>
                  {/* Logo background */}
                  <div className="absolute inset-1 bg-background dark:bg-gray-800 rounded-lg"></div>
                  {/* Logo content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-500">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="font-bold text-2xl tracking-wide bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text">BYTE-CORE VAULT</h1>
                  <p className="text-sm text-foreground/80">Your Ultimate Torn RPG Dashboard</p>
                </div>
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
                <CardTitle className="text-2xl font-bold tracking-wider bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent text-center">
                  <div>SIGN IN TO</div>
                  <div>BYTE-CORE VAULT</div>
                </CardTitle>
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
                  <p>First time users: Your account will be created automatically when you sign in.<br />
                  By entering your key and using this site, you agree to the <button 
                    type="button" 
                    onClick={() => setShowTosModal(true)}
                    className="text-primary hover:underline"
                  >
                    Terms Of Service
                  </button></p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Terms of Service Modal */}
      <Dialog open={showTosModal} onOpenChange={setShowTosModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Terms Of Service</DialogTitle>
            <DialogDescription>
              Please review our terms before using Byte-Core Vault
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="bg-muted/30 rounded-md p-4">
              <p className="font-medium text-center text-foreground">
                NOTE: Byte-Core Vault is a community-created companion tool for Torn. We operate independently and are not endorsed by or affiliated with the game developers.
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-blue-500 dark:text-blue-400">Your Privacy</h3>
                <p className="mt-1 text-foreground">We respect your privacy and only collect essential information to provide our services. You maintain control of your data and can request its removal at any time.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-blue-500 dark:text-blue-400">Information Usage</h3>
                <p className="mt-1 text-foreground">We use your information solely to enhance your gaming experience. Your data is never sold, traded, or transferred to outside parties without your explicit consent.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-blue-500 dark:text-blue-400">Service Functionality</h3>
                <p className="mt-1 text-foreground">By providing your API key, you allow us to:</p>
                <ul className="list-disc ml-5 mt-2 text-foreground">
                  <li>Create customized dashboard displays of your game statistics</li>
                  <li>Track market fluctuations and investment opportunities</li>
                  <li>Monitor faction and company performance metrics</li>
                  <li>Provide strategic insights based on game data analysis</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-blue-500 dark:text-blue-400">Security Commitment</h3>
                <p className="mt-1 text-foreground">Your API key is protected through advanced encryption and secure storage protocols. Our system employs multiple layers of protection to prevent unauthorized access to your information.</p>
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={() => setShowTosModal(false)} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                I Understand
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
