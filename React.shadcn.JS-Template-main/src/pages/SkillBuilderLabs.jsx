import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MOCK_SKILL_BUILDER_LABS } from "@/data/skillBuilderData";
import { LabCardSkeleton } from "@/components/common/LabCardSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, Star, Zap } from "lucide-react";
import { PriceBadge } from "@/components/common/PriceBadge";
import { stripHtmlToPlain } from "@/lib/stripHtml";

export default function SkillBuilderLabs() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const filteredLabs = MOCK_SKILL_BUILDER_LABS.filter((lab) => {
    const descPlain = stripHtmlToPlain(lab.description).toLowerCase();
    const matchesSearch =
      lab.title.toLowerCase().includes(search.toLowerCase()) ||
      descPlain.includes(search.toLowerCase());
    const matchesDifficulty =
      difficulty === "all" || lab.difficulty.toLowerCase() === difficulty.toLowerCase();
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-8 h-8 text-yellow-400" />
              <span className="text-sm font-semibold uppercase tracking-wider">Skill Builder Labs</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Build real skills with hands‑on labs
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8">
              Practice with interactive lessons, coding challenges, and real‑world projects. Master cloud, DevOps, and modern development skills.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-blue-700 hover:bg-blue-50">
                Browse Labs
              </Button>
              <Button variant="secondary" className="bg-blue-700/20 border border-blue-300/30 hover:bg-blue-700/30">
                Start with a Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search labs..."
                className="flex-1 md:w-80 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {["All", "AWS", "Azure", "GCP", "DevOps"].map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-slate-100"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Labs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-full">
                <LabCardSkeleton />
              </div>
            ))
          ) : filteredLabs.map((lab) => (
            <Link
              key={lab.id}
              to={`/skill-builder-labs/${lab.id}`}
              className="group"
            >
              <Card className="h-full overflow-hidden border-slate-200 hover:shadow-lg transition-shadow duration-200">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={lab.thumbnail}
                    alt={lab.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {lab.isFree ? (
                      <Badge className="bg-green-600 hover:bg-green-700">Free</Badge>
                    ) : (
                      <PriceBadge
                        isFree={false}
                        price={lab.price}
                        currency={lab.currency || "USD"}
                        className="bg-purple-600 hover:bg-purple-700"
                      />
                    )}
                    <Badge variant="secondary">{lab.difficulty}</Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                    {lab.title}
                  </CardTitle>
                  <p className="text-slate-500 text-sm line-clamp-2">
                    {stripHtmlToPlain(lab.description)}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {lab.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {lab.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        4.8
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Enroll</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-8 border border-indigo-100">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-indigo-700 mb-2">500+</div>
              <div className="text-slate-600">Hands‑on Labs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-700 mb-2">100K+</div>
              <div className="text-slate-600">Learners</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-700 mb-2">95%</div>
              <div className="text-slate-600">Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-700 mb-2">4.9/5</div>
              <div className="text-slate-600">Average Rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
