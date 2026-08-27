/** Accept legacy *_certificates and newer *_certifications permission ids. */
module.exports = {
    VIEW: [
        "view_certifications",
        "view_certificates",
        "manage_certificates",
        "manage_certifications",
    ],
    CREATE: [
        "create_certifications",
        "manage_certificates",
        "manage_certifications",
        "generate_certificates",
    ],
    EDIT: [
        "edit_certifications",
        "manage_certificates",
        "manage_certifications",
        "generate_certificates",
    ],
    DELETE: [
        "delete_certifications",
        "manage_certificates",
        "manage_certifications",
    ],
    ASSIGN: [
        "assign_certifications",
        "manage_certificates",
        "manage_certifications",
        "generate_certificates",
    ],
};
