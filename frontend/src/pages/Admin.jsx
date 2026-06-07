import { useEffect, useState } from "react";
import { api, formatErr, API_BASE } from "@/lib/api";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download } from "lucide-react";
import AdminCodex from "@/components/AdminCodex";
import AdminGpx from "@/components/AdminGpx";
import AdminTours from "@/components/AdminTours";
import AdminRewards from "@/components/AdminRewards";
import AdminAdvisories from "@/components/AdminAdvisories";

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [tours, setTours] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    const [b, u, t] = await Promise.all([
      api.get("/admin/bookings"),
      api.get("/admin/users"),
      api.get("/admin/tours"),
    ]);
    setBookings(b.data); setUsers(u.data); setTours(t.data);
  };
  useEffect(() => { load(); }, []);

  const complete = async (booking_id) => {
    setBusyId(booking_id);
    try {
      const { data } = await api.post("/bookings/complete", { booking_id });
      toast.success(data.already ? "Already completed" : `Awarded +${data.xp_gained} XP`);
      load();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      // Fetch as blob with cookie credentials, then trigger a download.
      const r = await fetch(`${API_BASE}/admin/bookings/export.csv`, { credentials: "include" });
      if (!r.ok) throw new Error(`Export failed (${r.status})`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `andeor-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (e) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-8">
          <span className="chip">Admin</span>
          <h1 className="font-display text-4xl mt-3">Mission control</h1>
          <p className="text-ink-700">Manage tours, partner goodies, advisories, and award completed bookings.</p>
        </div>

        <Tabs defaultValue="bookings">
          <TabsList className="rounded-full bg-sand-200 p-1 flex-wrap h-auto" data-testid="admin-tabs">
            <TabsTrigger value="bookings"   data-testid="admin-tab-bookings"   className="rounded-full">Bookings</TabsTrigger>
            <TabsTrigger value="tours"      data-testid="admin-tab-tours"      className="rounded-full">Tours</TabsTrigger>
            <TabsTrigger value="rewards"    data-testid="admin-tab-rewards"    className="rounded-full">Rewards</TabsTrigger>
            <TabsTrigger value="advisories" data-testid="admin-tab-advisories" className="rounded-full">Road advisories</TabsTrigger>
            <TabsTrigger value="codex"      data-testid="admin-tab-codex"      className="rounded-full">Codex</TabsTrigger>
            <TabsTrigger value="gpx"        data-testid="admin-tab-gpx"        className="rounded-full">GPX Tracks</TabsTrigger>
            <TabsTrigger value="users"      data-testid="admin-tab-users"      className="rounded-full">Players</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card className="card-clay p-6 mt-4" data-testid="admin-bookings-card">
              <div className="flex items-center justify-between mb-4 gap-3">
                <p className="text-sm text-ink-700">Override-award completed bookings if a guide can&apos;t reach the player to share a PIN.</p>
                <Button
                  onClick={exportCsv}
                  disabled={exporting}
                  data-testid="admin-bookings-export"
                  className="rounded-full bg-ocean-500 hover:bg-ocean-600 text-white shrink-0"
                >
                  <Download className="w-4 h-4 mr-1" /> {exporting ? "Exporting…" : "Export CSV"}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Tour</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Override</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.booking_id} data-testid={`admin-bk-${b.booking_id}`}>
                      <TableCell className="font-mono text-xs">{b.booking_id}</TableCell>
                      <TableCell className="font-mono text-xs">{b.user_id}</TableCell>
                      <TableCell>{b.tour_name}</TableCell>
                      <TableCell>{b.date}</TableCell>
                      <TableCell><Badge className={`rounded-full ${b.status === "completed" ? "bg-jungle-500 text-white" : "bg-sun-500 text-ink-900"}`}>{b.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {b.status !== "completed" && (
                          <Button size="sm" onClick={() => complete(b.booking_id)} disabled={busyId === b.booking_id} data-testid={`admin-complete-${b.booking_id}`} className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
                            Force-award
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="tours">
            <Card className="card-clay p-6 mt-4">
              <AdminTours tours={tours} reload={load} />
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <Card className="card-clay p-6 mt-4">
              <AdminRewards />
            </Card>
          </TabsContent>

          <TabsContent value="advisories">
            <Card className="card-clay p-6 mt-4">
              <AdminAdvisories />
            </Card>
          </TabsContent>

          <TabsContent value="codex">
            <AdminCodex />
          </TabsContent>

          <TabsContent value="gpx">
            <AdminGpx />
          </TabsContent>

          <TabsContent value="users">
            <Card className="card-clay p-6 mt-4" data-testid="admin-users-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead>Lv</TableHead>
                    <TableHead>Cards</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell className="tabular-nums">{u.xp}</TableCell>
                      <TableCell>{u.level}</TableCell>
                      <TableCell>{(u.cards || []).length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
