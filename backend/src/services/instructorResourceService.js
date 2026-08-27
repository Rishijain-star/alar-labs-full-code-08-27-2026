const { InstructorResource, InstructorResourceOptIn, Enrollment, Course, Certification, User } = require('../models');
const emailService = require('./emailService');
const logger = require('../lib/logger');

class InstructorResourceService {
    async createResource(data, userId) {
        return await InstructorResource.create({ ...data, created_by: userId });
    }

    async updateResource(id, data, userId) {
        const resource = await InstructorResource.findByPk(id);
        if (!resource) throw new Error("Resource not found");

        const oldVersion = resource.version;
        await resource.update({ ...data, updated_by: userId });

        if (data.version && data.version !== oldVersion) {
            await this.notifyOptedInUsers(resource);
        }
        return resource;
    }

    async deleteResource(id) {
        const resource = await InstructorResource.findByPk(id);
        if (!resource) throw new Error("Resource not found");
        await InstructorResourceOptIn.destroy({ where: { resource_id: id } });
        await resource.destroy();
        return true;
    }

    async listResources(filters = {}) {
        return await InstructorResource.findAll({
            where: filters,
            include: [
                { model: Course, as: 'course', attributes: ['id', 'title'] },
                { model: Certification, as: 'certification', attributes: ['id', 'title'] }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    async getResourceById(id) {
        return await InstructorResource.findByPk(id, {
            include: [
                { model: Course, as: 'course', attributes: ['id', 'title'] },
                { model: Certification, as: 'certification', attributes: ['id', 'title'] }
            ]
        });
    }

    async checkAccess(resourceId, userId) {
        const resource = await this.getResourceById(resourceId);
        if (!resource) throw new Error("Resource not found");

        if (resource.course_id) {
            const enroll = await Enrollment.findOne({
                where: { user_id: userId, course_id: resource.course_id, status: 'active' }
            });
            if (enroll) return true;
        }

        if (resource.certification_id) {
            // Check if user has an active enrollment in any course that belongs to this certification
            const enroll = await Enrollment.findOne({
                where: { user_id: userId, status: 'active' },
                include: [{
                    model: Course,
                    as: 'course',
                    where: { certification_id: resource.certification_id }
                }]
            });
            if (enroll) return true;
        }

        return false;
    }

    async optInUser(resourceId, userId, optedIn) {
        let optInRecord = await InstructorResourceOptIn.findOne({
            where: { resource_id: resourceId, user_id: userId }
        });

        if (optInRecord) {
            optInRecord.opted_in = optedIn;
            await optInRecord.save();
        } else {
            optInRecord = await InstructorResourceOptIn.create({
                resource_id: resourceId,
                user_id: userId,
                opted_in: optedIn
            });
        }
        return optInRecord;
    }

    async getUserOptInStatus(resourceId, userId) {
        const optInRecord = await InstructorResourceOptIn.findOne({
            where: { resource_id: resourceId, user_id: userId }
        });
        return optInRecord ? optInRecord.opted_in : false;
    }

    async notifyOptedInUsers(resource) {
        const optIns = await InstructorResourceOptIn.findAll({
            where: { resource_id: resource.id, opted_in: true },
            include: [{ model: User, as: 'user' }]
        });

        for (const optIn of optIns) {
            if (optIn.user && optIn.user.email) {
                try {
                    await emailService.sendCustom(
                        optIn.user.email,
                        `Update available: ${resource.title}`,
                        'resource_updated.html',
                        {
                            RESOURCE_TITLE: resource.title,
                            VERSION: resource.version
                        }
                    );
                } catch (err) {
                    logger.error(`Failed to notify user ${optIn.user.email} about resource ${resource.id}: ${err.message}`);
                }
            }
        }
    }
}

module.exports = new InstructorResourceService();
