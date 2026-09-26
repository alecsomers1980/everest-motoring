import { createClient } from "@/utils/supabase/server";
import ReportActions from "./ReportActions";
import GenerateReportButton from "./GenerateReportButton";
import StatTile from "@/components/admin/StatTile";
import { Surface, Label, Rule } from "@/components/ui/Surface";
import { monthWindow, inMonth, countByMonth, previousMonthName } from "@/utils/admin/trends";

export const metadata = {
    title: "Mission Control | Everest Admin",
};

export default async function AdminDashboardRoot() {
    const supabase = await createClient();

    // 1. Fetch Inventory Health Metrics
    const { data: cars } = await supabase.from('cars').select('price, status');

    const activeCars = cars?.filter(c => c.status === 'available') || [];
    const totalInventoryValue = activeCars.reduce((sum, car) => sum + (car.price || 0), 0);
    const reservedCars = cars?.filter(c => c.status === 'reserved') || [];

    // 2. Fetch Sales & CRM Velocity (Current Month vs Overall)
    const { data: leads } = await supabase.from('leads').select('status, created_at');

    // Bucket leads into the last 6 calendar months so the tiles can show a real
    // month-over-month delta and trend. Metrics without stored history (stock
    // level, floor value) deliberately get neither — see StatTile.
    const now = new Date();
    const MONTH_WINDOW = 6;
    const monthKeys = monthWindow(now, MONTH_WINDOW);
    const lastIndex = MONTH_WINDOW - 1;

    const leadTrend = countByMonth(leads, monthKeys);
    const wonTrend = countByMonth(leads, monthKeys, (l) => l.status === 'closed_won');

    const prevMonthName = previousMonthName(now);

    const leadsThisMonth = leads?.filter(l => inMonth(l.created_at, monthKeys[lastIndex])) || [];
    const closedWonLeads = leadsThisMonth.filter(l => l.status === 'closed_won');
    const financePendingLeads = leadsThisMonth.filter(l => l.status === 'finance_pending');

    const leadDelta = leadTrend[lastIndex] - leadTrend[lastIndex - 1];
    const wonDelta = wonTrend[lastIndex] - wonTrend[lastIndex - 1];

    // 3. Fetch Trade-In Volume
    const { count: tradeInCount } = await supabase
        .from('value_my_car_requests')
        .select('*', { count: 'exact', head: true });

    return (
        <div className="px-6 py-12 lg:px-10 max-w-7xl mx-auto w-full">
            <div className="flex flex-wrap justify-between items-start gap-6 mb-12">
                <div>
                    <Rule className="mb-5" />
                    <h1 className="text-display-sm font-semibold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500 mt-2">
                        Dealership performance at a glance.
                    </p>
                </div>
                <ReportActions />
            </div>

            {/* Inventory — no stored history, so these tiles carry no trend. */}
            <section className="mb-14">
                <Label as="h2" className="mb-5">Inventory</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <StatTile label="Showroom stock" value={activeCars.length} unit="units" />
                    <StatTile
                        label="Total floor value"
                        value={`R ${new Intl.NumberFormat('en-ZA').format(totalInventoryValue)}`}
                    />
                    <StatTile label="Reserved / pending" value={reservedCars.length} unit="units" />
                </div>
            </section>

            {/* Sales — leads carry created_at, so these show real month-over-month. */}
            <section className="mb-14">
                <Label as="h2" className="mb-5">Sales this month</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    <StatTile
                        label="Inquiries"
                        value={leadsThisMonth.length}
                        unit="leads"
                        delta={leadDelta}
                        deltaLabel={`vs ${prevMonthName}`}
                        trend={leadTrend}
                    />
                    <StatTile label="Finance pending" value={financePendingLeads.length} unit="queued" />
                    <StatTile
                        label="Deals won"
                        value={closedWonLeads.length}
                        delta={wonDelta}
                        deltaLabel={`vs ${prevMonthName}`}
                        trend={wonTrend}
                    />
                    <StatTile label="Trade-ins" value={tradeInCount || 0} unit="all time" />
                </div>
            </section>

            <Surface className="p-8 lg:p-12 bg-black border-hairline-dark">
                <div className="max-w-2xl">
                    <Label className="text-primary mb-4">Reports</Label>
                    <h3 className="text-display-sm font-semibold text-white mb-4">
                        Performance intelligence
                    </h3>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Compile dealership metrics into a shareable performance report —
                        showroom velocity and sales trends in a single snapshot.
                    </p>
                    <GenerateReportButton />
                </div>
            </Surface>

        </div>
    );
}
