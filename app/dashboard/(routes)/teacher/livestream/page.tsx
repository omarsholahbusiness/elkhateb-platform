"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useNavigationRouter } from "@/lib/hooks/use-navigation-router";

interface LiveSession {
    id: string;
    title: string;
    description: string | null;
    linkUrl: string;
    linkType: "ZOOM" | "GOOGLE_MEET";
    startDate: string;
    endDate: string | null;
    isPublished: boolean;
    isFree: boolean;
    courses: {
        id: string;
        title: string;
    }[];
    createdAt: string;
    updatedAt: string;
}

const LivestreamPage = () => {
    const router = useNavigationRouter();
    const [livestreams, setLivestreams] = useState<LiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState<string | null>(null);

    useEffect(() => {
        fetchLivestreams();
    }, []);

    const fetchLivestreams = async () => {
        try {
            const response = await fetch("/api/livestream/teacher");
            if (response.ok) {
                const data = await response.json();
                setLivestreams(data);
            } else {
                toast.error("حدث خطأ أثناء جلب الجلسات");
            }
        } catch (error) {
            console.error("Error fetching livestreams:", error);
            toast.error("حدث خطأ أثناء جلب الجلسات");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (session: LiveSession) => {
        if (!confirm("هل أنت متأكد من حذف هذه الجلسة؟")) {
            return;
        }

        setIsDeleting(session.id);
        try {
            const response = await fetch(`/api/livestream/${session.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف الجلسة بنجاح");
                fetchLivestreams();
            } else {
                toast.error("حدث خطأ أثناء حذف الجلسة");
            }
        } catch (error) {
            console.error("Error deleting livestream:", error);
            toast.error("حدث خطأ أثناء حذف الجلسة");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleTogglePublish = async (session: LiveSession) => {
        setIsPublishing(session.id);
        try {
            const response = await fetch(`/api/livestream/${session.id}/publish`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    isPublished: !session.isPublished
                }),
            });

            if (response.ok) {
                toast.success(session.isPublished ? "تم إلغاء النشر" : "تم النشر بنجاح");
                fetchLivestreams();
            } else {
                toast.error("حدث خطأ أثناء تغيير حالة النشر");
            }
        } catch (error) {
            console.error("Error toggling publish:", error);
            toast.error("حدث خطأ أثناء تغيير حالة النشر");
        } finally {
            setIsPublishing(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const filteredLivestreams = livestreams.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.courses.some(course => course.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    إدارة البث المباشر
                </h1>
                <Button onClick={() => router.push("/dashboard/teacher/livestream/create")} className="bg-brand hover:bg-brand/90 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    إنشاء جلسة جديدة
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>جلسات البث المباشر</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث في الجلسات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredLivestreams.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            لا توجد جلسات بث مباشر
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">العنوان</TableHead>
                                    <TableHead className="text-right">الكورسات</TableHead>
                                    <TableHead className="text-right">نوع الرابط</TableHead>
                                    <TableHead className="text-right">تاريخ البدء</TableHead>
                                    <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="text-right">مجاني</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLivestreams.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium">
                                            {session.title}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {session.courses.map((course) => (
                                                    <Badge key={course.id} variant="outline">
                                                        {course.title}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {session.linkType === "ZOOM" ? "Zoom" : "Google Meet"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(session.startDate)}
                                        </TableCell>
                                        <TableCell>
                                            {session.endDate ? formatDate(session.endDate) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={session.isPublished ? "default" : "secondary"}>
                                                {session.isPublished ? "منشور" : "مسودة"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={session.isFree ? "default" : "outline"}>
                                                {session.isFree ? "نعم" : "لا"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/dashboard/teacher/livestream/${session.id}/edit`)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    تعديل
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleTogglePublish(session)}
                                                    disabled={isPublishing === session.id}
                                                    className="bg-brand hover:bg-brand/90 text-white"
                                                >
                                                    {isPublishing === session.id ? (
                                                        "جاري..."
                                                    ) : session.isPublished ? (
                                                        <>
                                                            <EyeOff className="h-4 w-4 mr-1" />
                                                            إلغاء النشر
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            نشر
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(session)}
                                                    disabled={isDeleting === session.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {isDeleting === session.id ? "جاري..." : "حذف"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default LivestreamPage;
