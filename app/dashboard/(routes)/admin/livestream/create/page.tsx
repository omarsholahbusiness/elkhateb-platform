"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigationRouter } from "@/lib/hooks/use-navigation-router";

interface Course {
    id: string;
    title: string;
    isPublished: boolean;
}

interface Chapter {
    id: string;
    title: string;
    courseId: string;
}

const AdminCreateLivestreamPage = () => {
    const router = useNavigationRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [selectedChapterId, setSelectedChapterId] = useState<string>("");
    
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [linkType, setLinkType] = useState<"ZOOM" | "GOOGLE_MEET">("ZOOM");
    const [linkUrl, setLinkUrl] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isFree, setIsFree] = useState(false);
    
    const [isCreating, setIsCreating] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        // Fetch chapters when courses are selected
        if (selectedCourseIds.length > 0) {
            fetchChapters(selectedCourseIds);
        } else {
            setChapters([]);
            setSelectedChapterId("");
        }
    }, [selectedCourseIds]);

    const fetchCourses = async () => {
        try {
            setLoadingCourses(true);
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                // Admin can see all courses (published and unpublished)
                setCourses(data);
            } else {
                toast.error("حدث خطأ أثناء جلب الكورسات");
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            toast.error("حدث خطأ أثناء جلب الكورسات");
        } finally {
            setLoadingCourses(false);
        }
    };

    const fetchChapters = async (courseIds: string[]) => {
        try {
            const chapterPromises = courseIds.map(courseId =>
                fetch(`/api/courses/${courseId}/chapters`)
                    .then(res => res.ok ? res.json() : [])
                    .then(chapters => chapters.map((ch: any) => ({ ...ch, courseId })))
            );
            const chaptersArrays = await Promise.all(chapterPromises);
            const allChapters = chaptersArrays.flat();
            setChapters(allChapters);
        } catch (error) {
            console.error("Error fetching chapters:", error);
        }
    };

    const handleCourseToggle = (courseId: string) => {
        setSelectedCourseIds(prev => {
            if (prev.includes(courseId)) {
                return prev.filter(id => id !== courseId);
            } else {
                return [...prev, courseId];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!title.trim()) {
            toast.error("العنوان مطلوب");
            return;
        }

        if (!linkUrl.trim()) {
            toast.error("رابط الجلسة مطلوب");
            return;
        }

        if (!startDate) {
            toast.error("تاريخ البدء مطلوب");
            return;
        }

        if (selectedCourseIds.length === 0) {
            toast.error("يجب اختيار كورس واحد على الأقل");
            return;
        }

        // Validate chapter if selected
        const finalChapterId = selectedChapterId && selectedChapterId !== "none" ? selectedChapterId : null;
        if (finalChapterId) {
            const chapter = chapters.find(ch => ch.id === finalChapterId);
            if (chapter && !selectedCourseIds.includes(chapter.courseId)) {
                toast.error("الفصل يجب أن يكون من أحد الكورسات المحددة");
                return;
            }
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/livestream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                    linkUrl: linkUrl.trim(),
                    linkType,
                    startDate,
                    endDate: endDate || null,
                    isFree,
                    courseIds: selectedCourseIds,
                    chapterId: finalChapterId,
                }),
            });

            if (response.ok) {
                toast.success("تم إنشاء الجلسة بنجاح");
                router.push("/dashboard/admin/livestream");
            } else {
                const error = await response.json();
                toast.error(error.error || "حدث خطأ أثناء إنشاء الجلسة");
            }
        } catch (error) {
            console.error("Error creating livestream:", error);
            toast.error("حدث خطأ أثناء إنشاء الجلسة");
        } finally {
            setIsCreating(false);
        }
    };

    // Get available chapters based on selected courses
    const availableChapters = chapters.filter(ch =>
        selectedCourseIds.includes(ch.courseId as string)
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    إنشاء جلسة بث مباشر جديدة
                </h1>
                <Button variant="outline" onClick={() => router.push("/dashboard/admin/livestream")}>
                    العودة إلى الجلسات
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>معلومات الجلسة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>العنوان *</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="أدخل عنوان الجلسة"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>الوصف</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="أدخل وصف الجلسة"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>نوع الرابط *</Label>
                                <Select value={linkType} onValueChange={(value: "ZOOM" | "GOOGLE_MEET") => setLinkType(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ZOOM">Zoom</SelectItem>
                                        <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>رابط الجلسة *</Label>
                                <Input
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://..."
                                    type="url"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>تاريخ ووقت البدء *</Label>
                                <Input
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    type="datetime-local"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>تاريخ ووقت الانتهاء</Label>
                                <Input
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    type="datetime-local"
                                />
                                <p className="text-sm text-muted-foreground">
                                    اتركه فارغاً إذا لم يكن هناك وقت انتهاء محدد
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="isFree"
                                checked={isFree}
                                onCheckedChange={(checked) => setIsFree(checked === true)}
                                className="data-[state=checked]:bg-brand data-[state=checked]:text-white border-brand"
                            />
                            <Label htmlFor="isFree" className="cursor-pointer">
                                جلسة مجانية
                            </Label>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>الكورسات *</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            اختر كورس واحد أو أكثر لهذه الجلسة
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingCourses ? (
                            <div className="text-center py-4">جاري تحميل الكورسات...</div>
                        ) : courses.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                                لا توجد كورسات متاحة
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {courses.map((course) => (
                                    <div key={course.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`course-${course.id}`}
                                            checked={selectedCourseIds.includes(course.id)}
                                            onCheckedChange={() => handleCourseToggle(course.id)}
                                            className="data-[state=checked]:bg-brand data-[state=checked]:text-white border-brand"
                                        />
                                        <Label htmlFor={`course-${course.id}`} className="cursor-pointer flex-1">
                                            {course.title}
                                        </Label>
                                        <Badge variant="outline">
                                            {course.isPublished ? "منشور" : "مسودة"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedCourseIds.length > 0 && (
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium mb-2">الكورسات المحددة:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedCourseIds.map(courseId => {
                                        const course = courses.find(c => c.id === courseId);
                                        return course ? (
                                            <Badge key={courseId} variant="default">
                                                {course.title}
                                            </Badge>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {availableChapters.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>الفصل (اختياري)</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                يمكنك ربط الجلسة بفصل محدد من أحد الكورسات المحددة
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Select 
                                value={selectedChapterId || "none"} 
                                onValueChange={(value) => setSelectedChapterId(value === "none" ? "" : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر فصل (اختياري)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">لا يوجد</SelectItem>
                                    {availableChapters.map((chapter) => {
                                        const course = courses.find(c => c.id === chapter.courseId);
                                        return (
                                            <SelectItem key={chapter.id} value={chapter.id}>
                                                {chapter.title} {course && `(${course.title})`}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-end space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/dashboard/admin/livestream")}
                    >
                        إلغاء
                    </Button>
                    <Button type="submit" disabled={isCreating} className="bg-brand hover:bg-brand/90 text-white">
                        {isCreating ? "جاري الحفظ..." : "إنشاء الجلسة"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AdminCreateLivestreamPage;

