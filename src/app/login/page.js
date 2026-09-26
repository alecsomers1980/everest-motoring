import ClientAuthForms from "./ClientAuthForms";
import SignUpTracker from "@/components/SignUpTracker";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Login or Register | Everest Motoring Secure Portal",
    description: "Secure login portal and registration for Everest Motoring clients.",
};

export default async function LoginPage({ searchParams }) {
    const params = await searchParams;
    const error = params?.error;
    const message = params?.message;
    const isRegisteringClient = params?.register === 'client';
    const carId = params?.car_id || '';
    const registered = params?.registered;

    return (
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-4 py-12">
            <SignUpTracker method={registered || ""} when={!!registered} />
            <ClientAuthForms
                initialIsRegisteringClient={isRegisteringClient}
                carId={carId}
                initialError={error}
                initialMessage={message}
            />
        </div>
    );
}
