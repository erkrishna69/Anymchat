import { AuthFormSplitScreen } from "@/components/ui/login";

// A simple utility to simulate an API call
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AuthFormSplitScreenDemo() {
  // Define the submission handler
  const handleLogin = async (data: any) => {
    console.log("Form submitted with:", data);
    // Simulate network request
    await sleep(2000);
    alert("Login successful!");
  };

  return (
    <AuthFormSplitScreen
      logo={
        <h1 className="text-xl font-bold tracking-wider uppercase text-[#F0F4F8]">AnymChat</h1>
      }
      title="Welcome!"
      description="Sign in by entering the information below"
      imageSrc="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80"
      imageAlt="A calm starry night sky representing anonymous connection."
      onSubmit={handleLogin}
      forgotPasswordHref="#"
      createAccountHref="#"
    />
  );
}
