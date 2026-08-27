module.exports = {
    success(res, message, status = 200, data = null) {
        if (data == null) {

            return res.status(status).json({ status, success: true, message });
        }
        return res.status(status).json({ success: true, status, message, data });
    },

    fail(res, message = 'Something went wrong', status = 400, data = null) {
        if (data == null) {

            return res.status(status).json({ status, success: false, message });
        }
        return res.status(status).json({ success: false, status, message, data });
    }
    
};
