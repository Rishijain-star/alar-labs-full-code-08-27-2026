import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMyLearningQuery } from "@/store/api/learningApi";
import {
  siteContentApi,
  useGetPublicTrainingProgramsQuery,
} from "@/store/api/siteContentApi";
import { mapExpertTrainingProgramRow } from "@/lib/mapWebinarRow";
import { MyEnrolledProgramCard } from "@/components/training/MyEnrolledProgramCard";

async function loadEnrolledFromCatalog(dispatch, rows) {
  const checks = await Promise.all(
    rows.map(async (row) => {
      if (!row?.slug) return null;
      try {
        const res = await dispatch(
          siteContentApi.endpoints.getTrainingProgramBySlug.initiate(row.slug, {
            subscribe: false,
            forceRefetch: true,
          }),
        ).unwrap();
        const payload = res?.data ?? res;
        if (payload?.isEnrolled && payload?.program) {
          return mapExpertTrainingProgramRow(payload.program);
        }
      } catch {
        /* skip unavailable slug */
      }
      return null;
    }),
  );
  return checks.filter(Boolean);
}

export default function MyPrograms() {
  const dispatch = useDispatch();
  const [fallbackPrograms, setFallbackPrograms] = useState(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const {
    data: learningRes,
    isLoading: learningLoading,
    isError: learningError,
    refetch: refetchLearning,
  } = useGetMyLearningQuery(undefined, { refetchOnMountOrArgChange: true });

  const learningPayload = learningRes?.data ?? learningRes;
  const hasServerPrograms = Array.isArray(learningPayload?.trainingPrograms);

  const {
    data: catalogRes,
    isLoading: catalogLoading,
    isError: catalogError,
  } = useGetPublicTrainingProgramsQuery(
    { page: 1, limit: 100 },
    { skip: hasServerPrograms, refetchOnMountOrArgChange: true },
  );

  const programsFromLearning = useMemo(() => {
    if (!hasServerPrograms) return [];
    return (learningPayload.trainingPrograms ?? []).map(mapExpertTrainingProgramRow);
  }, [hasServerPrograms, learningPayload?.trainingPrograms]);

  useEffect(() => {
    if (hasServerPrograms) return undefined;

    let cancelled = false;
    const rows = catalogRes?.data?.rows ?? [];

    async function run() {
      if (!catalogRes) return;
      setFallbackLoading(true);
      setFallbackError(false);
      try {
        const enrolled = rows.length ? await loadEnrolledFromCatalog(dispatch, rows) : [];
        if (!cancelled) {
          setFallbackPrograms(enrolled);
          setFallbackLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFallbackError(true);
          setFallbackLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [hasServerPrograms, catalogRes, dispatch, retryKey]);

  const programs = hasServerPrograms ? programsFromLearning : fallbackPrograms ?? [];
  const isLoading =
    learningLoading || (!hasServerPrograms && (catalogLoading || fallbackLoading));
  const isError =
    learningError || (!hasServerPrograms && (catalogError || fallbackError));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading your programs…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 max-w-5xl">
        <h1 className="text-2xl font-bold">My Programs</h1>
        <p className="text-destructive">Could not load your programs. Try again.</p>
        <Button
          onClick={() => {
            if (hasServerPrograms) refetchLearning();
            else {
              setFallbackPrograms(null);
              setRetryKey((k) => k + 1);
            }
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Programs</h1>
        <p className="text-muted-foreground mt-1">
          Expert-led training programs you have enrolled in or purchased from the Training catalog.
        </p>
      </div>

      {programs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <GraduationCap className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No enrolled programs yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Browse published programs on the Training page and enroll to see them here.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/training">Browse Training</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch">
          {programs.map((training) => (
            <MyEnrolledProgramCard key={training.id} program={training} />
          ))}
        </div>
      )}
    </div>
  );
}
