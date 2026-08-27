import LearningWorkspacePage from "./LearningWorkspacePage";

/** Course learning at /courses/:slug/learn — same workspace as labs, course API + progress. */
export default function CourseLearningPage() {
  return <LearningWorkspacePage variant="course" />;
}
