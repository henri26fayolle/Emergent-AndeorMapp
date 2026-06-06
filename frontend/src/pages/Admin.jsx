import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const [b, u] = await Promise.all([api.get("/admin/bookings"), api.get("/admin/users")]);
    setBookings(b.data); setUsers(u.data);
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

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-8">
          <span className="chip">Admin</span>
          <h1 className="font-display text-4xl mt-3">Mission control</h1>
          <p className="text-ink-700">Mark tours completed to award XP, cards, badges, and rewards to players.</p>
        </div>

        <Tabs defaultValue="bookings">
          <TabsList className="rounded-full bg-sand-200 p-1" data-testid="admin-tabs">
            <TabsTrigger value="bookings" data-testid="admin-tab-bookings" className="rounded-full">Bookings</TabsTrigger>
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
                    <TableHead className="text-right">Action</TableHead>
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
                            Award
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
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
