import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Video,
  MessageSquare,
  Award,
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Target,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useGetPublicWebinarsQuery } from "@/store/api/webinarApi";
import { normalizeCoursesPayload } from "@/lib/normalizeApiPayload";
import { mapWebinarRow, instructorsFromWebinars } from "@/lib/mapWebinarRow";

// Stats data
const stats = [
  {
    title: "Courses Enrolled",
    value: "12",
    change: "+2 this month",
    icon: BookOpen,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950"
  },
  {
    title: "Completed Labs",
    value: "45",
    change: "+8 this week",
    icon: Target,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950"
  },
  {
    title: "Learning Hours",
    value: "128",
    change: "+12 this month",
    icon: TrendingUp,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950"
  },
  {
    title: "Certifications",
    value: "3",
    change: "1 in progress",
    icon: Award,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950"
  }
];

export default function UserDashboard() {
  const { data: webinarRes, isLoading: webinarsLoading } = useGetPublicWebinarsQuery(
    { limit: 8, page: 1 },
    { refetchOnMountOrArgChange: true }
  );

  const sessions = useMemo(() => {
    return normalizeCoursesPayload(webinarRes).map(mapWebinarRow);
  }, [webinarRes]);

  const instructors = useMemo(() => instructorsFromWebinars(sessions), [sessions]);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Expert-Led Training
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Live, interactive sessions with industry experts. Get personalized guidance, 
          real-time Q&A, and career-focused training.
        </p>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Video, title: "Live Sessions", desc: "Real-time interactive training" },
          { icon: MessageSquare, title: "Q&A Support", desc: "Ask questions directly" },
          { icon: Award, title: "Certificate", desc: "Industry-recognized credentials" },
          { icon: Users, title: "Small Groups", desc: "Personalized attention" },
        ].map((feature, index) => (
          <Card key={index} className="text-center border">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Trainings (live webinars from API) */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Upcoming Training Sessions</h2>
        {webinarsLoading && sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published sessions yet.</p>
        ) : (
          <div className="space-y-6">
            {sessions.map((training) => {
              const spotsLeft =
                training.maxCapacity > 0
                  ? Math.max(0, training.maxCapacity - training.enrolledCount)
                  : null;
              return (
                <Card key={training.id} className="overflow-hidden shadow-md">
                  <div className="grid md:grid-cols-4 gap-6 p-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={training.instructorImage}
                        alt={training.instructor}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-foreground">{training.instructor}</p>
                        <p className="text-sm text-muted-foreground">{training.instructorTitle}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{training.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        {training.isFree ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            FREE
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            ${training.price}
                          </Badge>
                        )}
                        <Badge variant="outline">{training.duration}</Badge>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{training.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{training.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{training.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>
                            {training.enrolledCount}
                            {training.maxCapacity ? `/${training.maxCapacity}` : ""} enrolled
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {training.topics.map((topic, i) => (
                          <Badge key={i} variant="secondary" className="bg-muted">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-center items-end gap-3">
                      <div className="text-right">
                        {training.isFree ? (
                          <p className="text-2xl font-bold text-foreground">Free</p>
                        ) : (
                          <p className="text-2xl font-bold text-foreground">${training.price}</p>
                        )}
                        <p className="text-xs text-muted-foreground">per person</p>
                      </div>
                      {training.enrollmentUrl && /^https?:\/\//i.test(String(training.enrollmentUrl).trim()) ? (
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="lg" asChild>
                          <a href={training.enrollmentUrl.trim()} target="_blank" rel="noopener noreferrer">
                            Enroll Now
                          </a>
                        </Button>
                      ) : (
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="lg" asChild>
                          <Link to="/courses">Enroll via courses</Link>
                        </Button>
                      )}
                      {spotsLeft !== null && (
                        <p className="text-xs text-muted-foreground">{spotsLeft} spots left</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructors (derived from webinar roster) */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Meet Our Instructors</h2>
        {instructors.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">
            Instructors from published live sessions will appear here.
          </p>
        ) : null}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {instructors.map((instructor, index) => (
            <Card key={index} className="shadow-md">
              <CardContent className="p-6 text-center">
                <img
                  src={instructor.image}
                  alt={instructor.name}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                />
                <h3 className="text-lg font-bold mb-1">{instructor.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{instructor.title}</p>
                <Badge variant="outline" className="mb-4">
                  {instructor.experience}
                </Badge>
                <div className="flex flex-wrap justify-center gap-2">
                  {instructor.expertise.map((skill, i) => (
                    <Badge key={i} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Why Choose */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <CardContent className="p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Why Choose Expert-Led Training?
              </h2>
              <ul className="space-y-3">
                {[
                  "Direct interaction with industry professionals",
                  "Real-world scenarios and case studies",
                  "Networking opportunities with peers",
                  "Hands-on labs in live environments",
                  "Personalized feedback and guidance",
                  "Career advice and mentorship",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">95%</div>
              <p className="text-white/90 mb-6">
                of our students report career advancement after completing training
              </p>
              <Button size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-blue-50">
                Browse All Training
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}