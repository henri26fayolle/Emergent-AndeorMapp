import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";
import AdminCodex from "@/components/AdminCodex";
import AdminGpx from "@/components/AdminGpx";

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [tours, setTours] = useState([]);
  const [busyId, setBusyId] = useState(null);

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

  const copyPin = async (pin) => {
    try { await navigator.clipboard.writeText(pin); toast.success(`Guide PIN copied: ${pin}`); }
    catch { toast.error("Copy failed"); }
  };

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-8">
          <span className="chip">Admin</span>
          <h1 className="font-display text-4xl mt-3">Mission control</h1>
          <p className="text-ink-700">Manage guide PINs, view players, and override-award completed bookings.</p>
        </div>

        <Tabs defaultValue="bookings">
          <TabsList className="rounded-full bg-sand-200 p-1" data-testid="admin-tabs">
            <TabsTrigger value="bookings" data-testid="admin-tab-bookings" className="rounded-full">Bookings</TabsTrigger>
            <TabsTrigger value="tours" data-testid="admin-tab-tours" className="rounded-full">Guide PINs</TabsTrigger>
            <TabsTrigger value="codex" data-testid="admin-tab-codex" className="rounded-full">Codex</TabsTrigger>
            <TabsTrigger value="gpx" data-testid="admin-tab-gpx" className="rounded-full">GPX Tracks</TabsTrigger>
            <TabsTrigger value="users" data-testid="admin-tab-users" className="rounded-full">Players</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card className="card-clay p-6 mt-4" data-testid="admin-bookings-card">
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
            <Card className="card-clay p-6 mt-4" data-testid="admin-tours-card">
              <p className="text-sm text-ink-700 mb-5 flex items-start gap-2">
                <KeyRound className="w-4 h-4 mt-0.5 text-sunset-500 shrink-0" />
                Share these guide PINs with the An Deor tour guides. Players enter the PIN at the end of the tour to claim XP & rewards.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tour</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead>Guide PIN</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tours.map((t) => (
                    <TableRow key={t.tour_id} data-testid={`admin-tour-${t.tour_id}`}>
                      <TableCell className="font-semibold">{t.name}</TableCell>
                      <TableCell><Badge className="rounded-full bg-sand-200 text-ink-900">{t.category}</Badge></TableCell>
                      <TableCell className="tabular-nums">{t.xp_reward}</TableCell>
                      <TableCell>
                        <span data-testid={`admin-pin-${t.tour_id}`} className="font-display text-lg tracking-[0.25em] uppercase bg-sand-100 border border-dashed border-ink-900/20 rounded-xl px-3 py-1.5">
                          {t.guide_pin}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => copyPin(t.guide_pin)} data-testid={`admin-pin-copy-${t.tour_id}`} className="rounded-full">
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
