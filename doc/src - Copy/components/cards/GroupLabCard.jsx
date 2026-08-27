import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Star, Users, Lock, Layers } from "lucide-react";
import { Link } from "react-router-dom";



export function GroupLabCard({
  id,
  title,
  description,
  thumbnail,
  isFree,
  price,
  duration,
  labsCount,
  rating,
  enrolledCount,
}) {
  return (
    <Card variant="elevated" className="overflow-hidden group">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant={isFree ? "free" : "paid"}>
            {isFree ? "FREE" : `$${price}`}
          </Badge>
        </div>
        {!isFree && (
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-md">
              <Lock className="w-4 h-4 text-secondary" />
            </div>
          </div>
        )}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-3 py-1.5 shadow-md">
            <Layers className="w-4 h-4" />
            <span className="text-sm font-semibold">{labsCount} Labs</span>
          </div>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="level" className="text-xs">
            Bundle
          </Badge>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-secondary text-secondary" />
            <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{enrolledCount.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Link to={`/group-labs/${id}`} className="w-full">
          <Button 
            variant={isFree ? "success" : "secondary"} 
            className="w-full"
          >
            {isFree ? "Start Now" : "View Details"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}