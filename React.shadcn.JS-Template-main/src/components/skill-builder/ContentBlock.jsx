import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RichTextContent from "@/components/learning/RichTextContent";
import { getRichTextBlockTitle } from "@/lib/richTextUtils";
import {
  Play,
  Code,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  FileText
} from "lucide-react";

export function VideoBlock({ block }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Play className="w-6 h-6 text-blue-600" />
          <CardTitle>{block.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center mb-4">
          <div className="text-center">
            <Play className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Video placeholder</p>
            <p className="text-sm text-slate-500 mt-1">{block.duration}</p>
          </div>
        </div>
        {block.description && (
          <p className="text-slate-700">{block.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RichTextBlock({ block }) {
  const title = block.title?.trim() || getRichTextBlockTitle(block);
  const showTitle = title && title !== "Reading";
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <RichTextContent
          html={block.content}
          title={showTitle ? title : null}
          showTitle={showTitle}
        />
      </CardContent>
    </Card>
  );
}

export function ImageBlock({ block }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-indigo-600" />
          {block.title && <CardTitle>{block.title}</CardTitle>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden mb-3">
          <img
            src={block.imageUrl}
            alt={block.title || "Image"}
            className="w-full h-auto"
          />
        </div>
        {block.caption && (
          <p className="text-sm text-slate-500 text-center italic">
            {block.caption}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function QuizBlock({ block }) {
  const [selected, setSelected] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const isCorrect = submitted && selected === block.correctAnswer;

  return (
    <Card className="mb-6 border-l-4 border-yellow-500">
      <CardHeader>
        <CardTitle className="text-lg">Quick Quiz</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-900 font-medium mb-6 text-lg">
          {block.question}
        </p>
        <div className="space-y-3 mb-6">
          {block.options.map((option, index) => (
            <button
              key={index}
              onClick={() => !submitted && setSelected(index)}
              disabled={submitted}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                submitted
                  ? index === block.correctAnswer
                    ? "border-green-500 bg-green-50"
                    : selected === index
                    ? "border-red-500 bg-red-50"
                    : "border-slate-200 bg-white opacity-60"
                  : selected === index
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option}</span>
                {submitted && (
                  index === block.correctAnswer ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : selected === index ? (
                    <XCircle className="w-6 h-6 text-red-600" />
                  ) : null
                )}
              </div>
            </button>
          ))}
        </div>
        {!submitted ? (
          <Button
            onClick={() => setSubmitted(true)}
            disabled={selected === null}
            className="w-full"
          >
            Submit Answer
          </Button>
        ) : (
          <div className={`p-4 rounded-lg ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
            <p className="font-semibold flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Correct!
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Not quite
                </>
              )}
            </p>
            <p className="text-sm text-slate-600">{block.explanation}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(null);
                setSubmitted(false);
              }}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TrueFalseBlock({ block }) {
  const [selected, setSelected] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const isCorrect =
    submitted && selected === block.correctAnswer;

  return (
    <Card className="mb-6 border-l-4 border-purple-500">
      <CardHeader>
        <CardTitle className="text-lg">True or False?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-900 font-medium mb-6 text-lg">
          {block.statement}
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => !submitted && setSelected(val)}
              disabled={submitted}
              className={`p-6 rounded-lg border-2 transition-all ${
                submitted
                  ? val === block.correctAnswer
                    ? "border-green-500 bg-green-50"
                    : selected === val
                    ? "border-red-500 bg-red-50"
                    : "border-slate-200 bg-white opacity-60"
                  : selected === val
                  ? "border-purple-500 bg-purple-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-2xl font-bold">
                {val ? "True" : "False"}
              </span>
              {submitted && val === block.correctAnswer && (
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mt-2" />
              )}
            </button>
          ))}
        </div>
        {!submitted ? (
          <Button
            onClick={() => setSubmitted(true)}
            disabled={selected === null}
            className="w-full"
          >
            Submit
          </Button>
        ) : (
          <div className={`p-4 rounded-lg ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
            <p className="font-semibold flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Correct!
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Incorrect
                </>
              )}
            </p>
            <p className="text-sm text-slate-600">{block.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CodeBlock({ block }) {
  return (
    <Card className="mb-6 border-l-4 border-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="w-6 h-6 text-blue-600" />
            {block.title && <CardTitle className="text-lg">{block.title}</CardTitle>}
          </div>
          {block.language && (
            <Badge variant="secondary">{block.language}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
          <code>{block.code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

export function FillInTheBlankBlock({ block }) {
  const [answers, setAnswers] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <Card className="mb-6 border-l-4 border-orange-500">
      <CardHeader>
        <CardTitle className="text-lg">Fill in the Blanks</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-900 mb-6 leading-relaxed text-lg">
          {block.question}
        </p>
        {!submitted ? (
          <Button onClick={() => setSubmitted(true)} className="w-full">
            Check Answer
          </Button>
        ) : (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-slate-600">{block.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const BLOCK_RENDERERS = {
  video: VideoBlock,
  richText: RichTextBlock,
  image: ImageBlock,
  quiz: QuizBlock,
  trueFalse: TrueFalseBlock,
  code: CodeBlock,
  fillInTheBlank: FillInTheBlankBlock,
};

export default function ContentBlock({ block }) {
  const Renderer = BLOCK_RENDERERS[block.type];
  if (!Renderer) {
    console.warn(`Unknown block type: ${block.type}`);
    return null;
  }
  return <Renderer block={block} />;
}
