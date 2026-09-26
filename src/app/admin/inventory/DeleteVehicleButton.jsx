"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";

export default function DeleteVehicleButton({ car, deleteCarAction }) {
    const [isPending, startTransition] = useTransition();
    const [errorMsg, setErrorMsg] = useState(null);

    function handleClick() {
        const label = `${car.year} ${car.make} ${car.model}`;
        if (!window.confirm(`Permanently delete ${label}? This cannot be undone.`)) return;

        setErrorMsg(null);
        startTransition(async () => {
            const result = await deleteCarAction(car.id);
            if (!result?.success) {
                const message = result?.error || "Delete failed for an unknown reason.";
                setErrorMsg(message);
                window.alert(`Could not delete ${label}.\n\n${message}\n\nThis is usually because the vehicle still has linked records (sales, leads, test-drive requests, or trade-in offers). Tell Claude the error code above and it will fix the constraint.`);
            }
        });
    }

    return (
        <>
            <IconButton
                onClick={handleClick}
                disabled={isPending}
                busy={isPending}
                tone="danger"
                aria-label={isPending ? "Deleting vehicle" : "Delete vehicle"}
                title={isPending ? "Deleting..." : "Delete Vehicle"}
            >
                {isPending ? <Loader2 className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
            </IconButton>
            {errorMsg && (
                <span className="hidden" data-delete-error={errorMsg} />
            )}
        </>
    );
}
