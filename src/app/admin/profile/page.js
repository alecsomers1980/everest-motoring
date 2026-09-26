import { createClient } from "@/utils/supabase/server";
import ProfileForm from "./ProfileForm";

export const metadata = {
  title: "My Profile | Everest Admin",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex-1 w-full px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          My Profile
        </h1>
        <p className="text-slate-500 mt-1">Update your details and password.</p>
        <ProfileForm
          initial={{
            firstName: profile?.first_name || "",
            lastName: profile?.last_name || "",
            phone: profile?.phone || "",
            email: user?.email || "",
          }}
        />
      </div>
    </div>
  );
}
