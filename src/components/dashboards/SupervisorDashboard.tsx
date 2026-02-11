import React, { useState, useEffect, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { dbPush, dbListen } from '@/lib/firebase';
import SlidePanel from '@/components/ui/SlidePanel';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, GraduationCap, BookOpen, Plus, 
  Megaphone, UserPlus, School, Bell, Calendar
} from 'lucide-react';

interface Teacher { id: string; name: string; username: string; password: string; subject: string; }
interface Class { id: string; name: string; grade: string; teacherId: string; teacherName: string; }
interface Student { id: string; name: string; username: string; password: string; classId: string; className: string; }
interface Announcement { id: string; title: string; content: string; priority: 'normal' | 'important' | 'urgent'; createdAt: string; author: string; classId?: string; }

interface SupervisorDashboardProps { currentPage: string; }

const SupervisorDashboard = forwardRef<HTMLDivElement, SupervisorDashboardProps>(({ currentPage }, ref) => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [showPanel, setShowPanel] = useState<string | null>(null);
  
  const [newTeacher, setNewTeacher] = useState({ name: '', username: '', password: '', subject: '' });
  const [newClass, setNewClass] = useState({ name: '', grade: '', teacherId: '' });
  const [newStudent, setNewStudent] = useState({ name: '', username: '', password: '', classId: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', priority: 'normal' as const, classId: '' });
  
  const { toast } = useToast();

  useEffect(() => {
    const unsubs = [
      dbListen('teachers', (data) => setTeachers(data ? Object.entries(data).map(([id, t]: [string, any]) => ({ id, ...t })) : [])),
      dbListen('classes', (data) => {
        const allContextClasses = data ? Object.entries(data).map(([id, c]: [string, any]) => ({ id, ...c })) : [];
        // Filter classes assigned to this supervisor
        const filteredClasses = allContextClasses.filter(c => user?.assignedClassIds?.includes(c.id));
        setClasses(filteredClasses);
      }),
      dbListen('students', (data) => {
        const allStudents = data ? Object.entries(data).map(([id, s]: [string, any]) => ({ id, ...s })) : [];
        // Only show students in supervisor's assigned classes
        const filteredStudents = allStudents.filter(s => user?.assignedClassIds?.includes(s.classId));
        setStudents(filteredStudents);
      }),
      dbListen('announcements', (data) => {
        const allAnnouncements = data ? Object.entries(data).map(([id, a]: [string, any]) => ({ id, ...a })) : [];
        // Show general announcements OR those for assigned classes
        const filteredAnnouncements = allAnnouncements.filter(a => !a.classId || user?.assignedClassIds?.includes(a.classId))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAnnouncements(filteredAnnouncements);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [user?.assignedClassIds]);

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.username || !newTeacher.password || !newTeacher.subject) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" }); return;
    }
    await dbPush('teachers', { ...newTeacher, createdAt: new Date().toISOString() });
    setNewTeacher({ name: '', username: '', password: '', subject: '' });
    setShowPanel(null);
    toast({ title: "Success", description: "Teacher added successfully" });
  };

  const handleAddClass = async () => {
    if (!newClass.name || !newClass.grade || !newClass.teacherId) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" }); return;
    }
    const teacher = teachers.find(t => t.id === newClass.teacherId);
    const result = await dbPush('classes', { ...newClass, teacherName: teacher?.name || 'Unassigned', createdAt: new Date().toISOString() });
    
    // Auto-assign this new class to the supervisor who created it
    if (result && user?.id) {
      const supervisors = await dbPush('supervisors/' + user.id + '/assignedClassIds', result.name);
    }

    setNewClass({ name: '', grade: '', teacherId: '' });
    setShowPanel(null);
    toast({ title: "Success", description: "Class created and assigned to you" });
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.username || !newStudent.password || !newStudent.classId) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" }); return;
    }
    const cls = classes.find(c => c.id === newStudent.classId);
    await dbPush('students', { ...newStudent, className: cls?.name || 'Unassigned', createdAt: new Date().toISOString() });
    setNewStudent({ name: '', username: '', password: '', classId: '' });
    setShowPanel(null);
    toast({ title: "Success", description: "Student enrolled successfully" });
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content || !newAnnouncement.classId) {
      toast({ title: "Error", description: "Please fill all fields and select a class", variant: "destructive" }); return;
    }
    await dbPush('announcements', { ...newAnnouncement, author: `Supervisor (${user?.name})`, createdAt: new Date().toISOString() });
    setNewAnnouncement({ title: '', content: '', priority: 'normal', classId: '' });
    setShowPanel(null);
    toast({ title: "Success", description: "Announcement posted to class" });
  };

  const StatCard = ({ title, value, icon: Icon, gradient, delay = 0 }: any) => (
    <Card className={`stat-card border-0 shadow-xl ${gradient} animate-fade-in`} style={{ animationDelay: `${delay}s` }}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-foreground/80 text-sm font-medium">{title}</p>
            <p className="text-4xl font-display font-bold text-primary-foreground mt-2">{value}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
            <Icon className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (currentPage === 'dashboard') {
    return (
      <div ref={ref} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Students" value={students.length} icon={GraduationCap} gradient="bg-gradient-primary" delay={0.1} />
          <StatCard title="Total Teachers" value={teachers.length} icon={Users} gradient="bg-gradient-secondary" delay={0.2} />
          <StatCard title="Active Classes" value={classes.length} icon={BookOpen} gradient="bg-gradient-accent" delay={0.3} />
          <StatCard title="Announcements" value={announcements.length} icon={Megaphone} gradient="bg-gradient-warm" delay={0.4} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow-2xl border-0 overflow-hidden group hover-lift">
            <div className="h-2 bg-gradient-primary"></div>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <School className="w-5 h-5 text-primary" /> Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => setShowPanel('teacher')} className="h-16 flex flex-col gap-1 bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground border-0">
                  <UserPlus className="w-5 h-5" /> <span>Add Teacher</span>
                </Button>
                <Button onClick={() => setShowPanel('class')} className="h-16 flex flex-col gap-1 bg-primary/10 hover:bg-primary/20 text-primary-foreground border-0">
                  <Plus className="w-5 h-5" /> <span>Add Class</span>
                </Button>
                <Button onClick={() => setShowPanel('student')} className="h-16 flex flex-col gap-1 bg-accent/10 hover:bg-accent/20 text-accent-foreground border-0">
                  <GraduationCap className="w-5 h-5" /> <span>Add Student</span>
                </Button>
                <Button onClick={() => setShowPanel('announcement')} className="h-16 flex flex-col gap-1 bg-warm/10 hover:bg-warm/20 text-warm-foreground border-0">
                  <Bell className="w-5 h-5" /> <span>Post Notice</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xl border-0 overflow-hidden group hover-lift">
            <div className="h-2 bg-gradient-warm"></div>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-warm" /> Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.slice(0, 4).map((ann, i) => (
                  <div key={ann.id} className="flex gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      ann.priority === 'urgent' ? 'bg-destructive/10 text-destructive' : 
                      ann.priority === 'important' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                    }`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{ann.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{ann.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(ann.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panels */}
        <SlidePanel isOpen={showPanel === 'teacher'} onClose={() => setShowPanel(null)} title="Add New Teacher">
          <div className="space-y-4">
            <Input placeholder="Full Name" value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} />
            <Input placeholder="Username" value={newTeacher.username} onChange={e => setNewTeacher({...newTeacher, username: e.target.value})} />
            <Input placeholder="Password" type="password" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} />
            <Input placeholder="Subject" value={newTeacher.subject} onChange={e => setNewTeacher({...newTeacher, subject: e.target.value})} />
            <Button className="w-full bg-gradient-secondary" onClick={handleAddTeacher}>Add Teacher</Button>
          </div>
        </SlidePanel>

        <SlidePanel isOpen={showPanel === 'class'} onClose={() => setShowPanel(null)} title="Create New Class">
          <div className="space-y-4">
            <Input placeholder="Class Name (e.g. Grade 10-A)" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} />
            <Input placeholder="Grade Level" value={newClass.grade} onChange={e => setNewClass({...newClass, grade: e.target.value})} />
            <select className="w-full p-2 border rounded-md" value={newClass.teacherId} onChange={e => setNewClass({...newClass, teacherId: e.target.value})}>
              <option value="">Select Primary Teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>)}
            </select>
            <Button className="w-full bg-gradient-primary" onClick={handleAddClass}>Create Class</Button>
          </div>
        </SlidePanel>

        <SlidePanel isOpen={showPanel === 'student'} onClose={() => setShowPanel(null)} title="Enroll Student">
          <div className="space-y-4">
            <Input placeholder="Full Name" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
            <Input placeholder="Username" value={newStudent.username} onChange={e => setNewStudent({...newStudent, username: e.target.value})} />
            <Input placeholder="Password" type="password" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
            <select className="w-full p-2 border rounded-md" value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button className="w-full bg-gradient-accent" onClick={handleAddStudent}>Enroll Student</Button>
          </div>
        </SlidePanel>

        <SlidePanel isOpen={showPanel === 'announcement'} onClose={() => setShowPanel(null)} title="Post Announcement">
          <div className="space-y-4">
            <Input placeholder="Title" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} />
            <textarea className="w-full p-2 border rounded-md h-32" placeholder="Content" value={newAnnouncement.content} onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})} />
            <select className="w-full p-2 border rounded-md" value={newAnnouncement.classId} onChange={e => setNewAnnouncement({...newAnnouncement, classId: e.target.value})}>
              <option value="">Target Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="w-full p-2 border rounded-md" value={newAnnouncement.priority} onChange={e => setNewAnnouncement({...newAnnouncement, priority: e.target.value as any})}>
              <option value="normal">Normal Priority</option>
              <option value="important">Important Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
            <Button className="w-full bg-gradient-warm" onClick={handleAddAnnouncement}>Post Notice</Button>
          </div>
        </SlidePanel>
      </div>
    );
  }

  return null;
});

SupervisorDashboard.displayName = 'SupervisorDashboard';

export default SupervisorDashboard;
