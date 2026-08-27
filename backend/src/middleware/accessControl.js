const { Enrollment, CourseMedia, Lab, LabAssignment } = require("../models");
const { AppError } = require("./errorHandler");
const logger = require("../lib/logger");
const path = require("path");

/**
 * Middleware to check if a user has access to a course's streaming content.
 * Exempts thumbnails and preview videos.
 */
const checkCourseStreamingAccess = async (req, res, next) => {
    try {
        const { course_id, lesson_id } = req.params;

        // Overview intro hero (HLS) is public on course detail pages
        if (lesson_id === "_intro") {
            return next();
        }

        // Stream route sets req.params[0] to the file path; /content/key/:lesson_id has no wildcard.
        const file = req.params[0];
        const ext = file != null && typeof file === "string"
            ? path.extname(file).toLowerCase()
            : "";

        // 1. PUBLIC EXEMPTION: Images (thumbnails) are always public
        const isImage = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
        if (isImage) {
            return next();
        }

        // 2. PREVIEW EXEMPTION: Check if this lesson is a free preview
        const media = await CourseMedia.findOne({
            where: { course_id: course_id, lesson_id: lesson_id }
        });

        if (media && media.is_preview) {
            return next();
        }

        // 3. AUTHENTICATION CHECK: Must be logged in for non-preview video content
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to view this content"
            });
        }

        const user_id = req.user.user_id;
        const role = req.user_role;

        // 3. ADMIN/OWNER EXEMPTION: Allow admins/owners to view everything
        if (role === "admin" || role === "owner" || role === "superadmin") {
            return next();
        }

        // 4. ENROLLMENT CHECK: Check if user has purchased/enrolled in the course
        const enrollment = await Enrollment.findOne({
            where: {
                user_id,
                course_id: course_id,
                status: "active"
            }
        });

        if (!enrollment) {
            // Check if course is free (though typically we still want enrollment for tracking)
            const { Course } = require("../models");
            const course = await Course.findByPk(course_id);
            if (course && course.is_free) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: "You must purchase this course to view this content",
                requires_purchase: true
            });
        }

        // Access granted
        next();
    } catch (error) {
        logger.error("[AccessControl] checkCourseStreamingAccess error:", error);
        return res.status(500).json({ success: false, message: "Internal server error during access check" });
    }
};

/**
 * Middleware to check if a user has access to a lab.
 */
const checkLabAccess = async (req, res, next) => {
    try {
        const lab_id = req.params.id || req.params.lab_id || req.params.labId;
        if (!lab_id) return next();

        const lab = await Lab.findByPk(lab_id);
        if (!lab) {
            throw new AppError("Lab not found", 404);
        }

        // 1. PUBLIC EXEMPTION: Free labs
        if (lab.is_free) {
            return next();
        }

        // 2. AUTHENTICATION CHECK
        if (!req.user || !req.user.user_id) {
            throw new AppError("Authentication required to access this lab", 401);
        }

        const user_id = req.user.user_id;
        const role = req.user_role;

        // 3. ADMIN/OWNER EXEMPTION: Allow admins/owners to view everything
        if (role === "admin" || role === "owner" || role === "superadmin") {
            return next();
        }

        // 4. ENROLLMENT/ASSIGNMENT CHECK
        // If lab belongs to a course, check course enrollment
        if (lab.course_id) {
            const enrollment = await Enrollment.findOne({
                where: {
                    user_id,
                    course_id: lab.course_id,
                    status: "active"
                }
            });
            if (enrollment) return next();
        }

        // Check for direct lab assignment (for standalone labs)
        const assignment = await LabAssignment.findOne({
            where: {
                assigned_to: user_id,
                lab_id: lab_id,
                status: "active"
            }
        });

        if (assignment) return next();

        // No access
        throw new AppError("You do not have access to this lab. Please purchase the course or lab.", 403);
    } catch (error) {
        if (error instanceof AppError) return next(error);
        logger.error("[AccessControl] checkLabAccess error:", error);
        return res.status(500).json({ success: false, message: "Internal server error during access check" });
    }
};

/**
 * Same rules as checkLabAccess, but resolves the lab by URL slug first.
 * Sets req.params.id so downstream handlers can reuse id-based logic.
 */
const checkLabAccessBySlug = async (req, res, next) => {
    try {
        const slug = req.params.slug;
        if (!slug) return next();

        const lab = await Lab.findOne({ where: { slug } });
        if (!lab) {
            throw new AppError("Lab not found", 404);
        }
        req.params.id = lab.id;
        return checkLabAccess(req, res, next);
    } catch (error) {
        if (error instanceof AppError) return next(error);
        logger.error("[AccessControl] checkLabAccessBySlug error:", error);
        return res.status(500).json({ success: false, message: "Internal server error during access check" });
    }
};

module.exports = {
    checkCourseStreamingAccess,
    checkLabAccess,
    checkLabAccessBySlug,
};
