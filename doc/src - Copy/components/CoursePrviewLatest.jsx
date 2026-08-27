import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  GraduationCap,
  User,
  BookOpen,
  Target,
  FileText,
  Video,
  Download,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "@/lib/toast";

// Dummy course data with full content
const dummyCourse = {
  id: "c1",
  title: "Python for Data Science - Complete Bootcamp",
  author: "Dr. Sarah Johnson",
  author_bio: "Ph.D. in Computer Science with 10+ years of teaching experience. Former Data Scientist at Google.",
  author_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  category: "Data Science",
  level: "Beginner",
  status: "pending",
  submitted_at: "2026-02-10T10:30:00",
  duration: "40 hours",
  price: 99,
  students_enrolled: 0,
  rating: 0,
  thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
  
  description: "Master Python programming with a focus on data analysis, visualization, and machine learning. This comprehensive bootcamp covers everything from Python basics to advanced data science techniques. You'll work with real-world datasets and build practical projects that you can add to your portfolio.\n\nBy the end of this course, you'll be able to analyze complex datasets, create stunning visualizations, and build machine learning models to solve real business problems.",
  
  what_you_will_learn: [
    "Master Python fundamentals including data types, functions, and object-oriented programming",
    "Perform data analysis using Pandas and NumPy libraries",
    "Create professional visualizations with Matplotlib, Seaborn, and Plotly",
    "Build and evaluate machine learning models using Scikit-learn",
    "Work with real-world datasets from various industries",
    "Implement data cleaning and preprocessing techniques",
    "Apply statistical analysis to extract insights from data",
    "Deploy machine learning models to production",
  ],
  
  prerequisites: [
    "Basic computer skills and familiarity with using a web browser",
    "No programming experience required - we start from scratch",
    "A computer with internet connection (Windows, Mac, or Linux)",
    "Willingness to practice coding daily for best results",
  ],
  
  target_audience: [
    "Beginners who want to start a career in data science",
    "Professionals looking to transition into data-related roles",
    "Students pursuing degrees in computer science or related fields",
    "Business analysts wanting to enhance their technical skills",
    "Anyone interested in learning Python for data analysis",
  ],
  
  curriculum: [
    {
      section: "Getting Started with Python",
      duration: "6 hours",
      lectures: 12,
      topics: [
        "Introduction to Python and Setup",
        "Python Basics: Variables and Data Types",
        "Control Flow: If Statements and Loops",
        "Functions and Modules",
        "Working with Files and Exceptions",
        "Object-Oriented Programming Basics",
      ],
    },
    {
      section: "Data Analysis with NumPy and Pandas",
      duration: "10 hours",
      lectures: 18,
      topics: [
        "Introduction to NumPy Arrays",
        "Array Operations and Broadcasting",
        "Introduction to Pandas DataFrames",
        "Data Cleaning and Preprocessing",
        "Grouping and Aggregation",
        "Merging and Joining Datasets",
        "Time Series Analysis",
        "Working with Real-World Datasets",
      ],
    },
    {
      section: "Data Visualization",
      duration: "8 hours",
      lectures: 14,
      topics: [
        "Matplotlib Fundamentals",
        "Creating Line, Bar, and Scatter Plots",
        "Advanced Matplotlib Customization",
        "Statistical Plots with Seaborn",
        "Interactive Visualizations with Plotly",
        "Creating Dashboards",
        "Best Practices in Data Visualization",
      ],
    },
    {
      section: "Machine Learning with Scikit-learn",
      duration: "12 hours",
      lectures: 20,
      topics: [
        "Introduction to Machine Learning",
        "Linear and Logistic Regression",
        "Decision Trees and Random Forests",
        "Support Vector Machines",
        "K-Means Clustering",
        "Model Evaluation and Validation",
        "Feature Engineering",
        "Hyperparameter Tuning",
        "Building a Complete ML Pipeline",
      ],
    },
    {
      section: "Capstone Projects",
      duration: "4 hours",
      lectures: 6,
      topics: [
        "Project 1: Customer Churn Prediction",
        "Project 2: Sales Forecasting Dashboard",
        "Project 3: Sentiment Analysis System",
        "Portfolio Building and GitHub",
      ],
    },
  ],
  
  course_materials: [
    "50+ hours of HD video content",
    "100+ coding exercises with solutions",
    "20+ real-world datasets for practice",
    "Downloadable Jupyter notebooks for all lectures",
    "Cheat sheets and reference materials",
    "Certificate of completion",
  ],
  
  instructor_response_time: "Within 24 hours",
  last_updated: "February 2026",
  language: "English",
  captions: ["English", "Spanish", "French"],
};

export default function CoursePreview() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  
  const [course] = useState(dummyCourse);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      toast.success("Course approved successfully!");
      setApproveDialogOpen(false);
      setIsProcessing(false);
      navigate("/admin/content-approval");
    }, 1000);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    
    setIsProcessing(true);
    setTimeout(() => {
      toast.success("Course rejected successfully!");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setIsProcessing(false);
      navigate("/admin/content-approval");
    }, 1000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/content-approval")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Approvals
        </Button>
        <div className="flex items-center gap-3">
          {getStatusBadge(course.status)}
          {course.status === "pending" && (
            <>
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() => setApproveDialogOpen(true)}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Approve Course
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Course Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Thumbnail */}
            <div className="md:w-80 flex-shrink-0">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-48 object-cover rounded-lg"
              />
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="secondary">{course.category}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level:</span>
                  <Badge variant="outline" className="capitalize">{course.level}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">${course.price}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">{course.last_updated}</span>
                </div>
              </div>
            </div>

            {/* Course Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              
              {/* Author Info */}
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={course.author_avatar}
                  alt={course.author}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-medium">{course.author}</p>
                  <p className="text-sm text-muted-foreground">{course.author_bio}</p>
                </div>
              </div>

              {/* Submission Info */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted On</p>
                    <p className="font-medium">
                      {new Date(course.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Course ID</p>
                    <p className="font-medium">{course.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Language</p>
                    <p className="font-medium">{course.language}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Captions</p>
                    <p className="font-medium">{course.captions.join(", ")}</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-primary" />
                  <span>{course.curriculum.reduce((acc, section) => acc + section.lectures, 0)} lectures</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Download className="h-4 w-4 text-primary" />
                  <span>Downloadable resources</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Course Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {course.description}
              </p>
            </CardContent>
          </Card>

          {/* What You'll Learn */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                What You'll Learn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {course.what_you_will_learn.map((item, index) => (
                  <div key={index} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Who This Course Is For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {course.target_audience.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Curriculum
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {course.curriculum.length} sections • {" "}
                {course.curriculum.reduce((acc, section) => acc + section.lectures, 0)} lectures • {" "}
                {course.duration} total length
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.curriculum.map((section, sectionIndex) => (
                <Card key={sectionIndex} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Section {sectionIndex + 1}: {section.section}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{section.lectures} lectures</span>
                        <span>{section.duration}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.topics.map((topic, topicIndex) => (
                        <li key={topicIndex} className="flex items-center gap-3 text-sm">
                          <Play className="h-4 w-4 text-muted-foreground" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-6">
          {/* Prerequisites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Prerequisites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {course.prerequisites.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Technical Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Computer with Windows, Mac, or Linux</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Stable internet connection for streaming video content</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>At least 4GB RAM recommended</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>10GB free disk space for software and practice files</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Course Materials Included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {course.course_materials.map((material, index) => (
                  <div key={index} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{material}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Instructor Support */}
          <Card>
            <CardHeader>
              <CardTitle>Instructor Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Response Time</p>
                  <p className="text-sm text-muted-foreground">
                    {course.instructor_response_time}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Support Channels</p>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Q&A section for each lecture</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Direct messaging with instructor</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Community discussion forums</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve "{course.title}"? This will make the course
              visible to all students.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900">
                  Course meets quality standards
                </p>
                <p className="text-xs text-green-700">
                  Content is complete, well-structured, and ready for publication
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Approve Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Course</DialogTitle>
            <DialogDescription>
              Provide detailed feedback about why this course is being rejected. This will
              help the instructor improve their submission.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Please provide specific feedback about what needs to be improved (e.g., content quality, structure, missing information, technical issues...)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Be constructive and specific to help the instructor make necessary improvements
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}