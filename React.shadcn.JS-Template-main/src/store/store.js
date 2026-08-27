// src/store/store.js - DEBUGGING VERSION
// Use this to identify which API is causing the issue

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import uploadReducer from "./slices/uploadSlice";
import courseReducer from "./slices/courseSlice";
import userReducer from "./slices/userSlice";
import categoryReducer from "./slices/categorySlice";

// Import APIs one by one to find the problematic one
import { authApi } from "./api/authApi";
import { roleAndPermissionApi } from "./api/roleAndPermissionApi";
import { userApi } from "./api/userApi";
import { courseApi } from "./api/courseApi";
import { categoryApi } from "./api/categoryApi";
import { labApi } from "./api/labApi";
import { technologySkillApi } from "./api/technologySkillApi";
import { learningApi } from "./api/learningApi";
import { digitalProgramApi } from "./api/digitalProgramApi";
import { webinarApi } from "./api/webinarApi";
import { assessmentApi } from "./api/assessmentApi";
import { examTopicsApi } from "./api/examTopicsApi";
import { certificationCatalogApi } from "./api/certificationCatalogApi";
import { certificationAdminApi } from "./api/certificationAdminApi";
import { voucherApi } from "./api/voucherApi";
import { supportApi } from "./api/supportApi";
import { legalApi } from "./api/legalApi";
import { notificationApi } from "./api/notificationApi";
import { siteContentApi } from "./api/siteContentApi";
import { cloudServiceApi } from "./api/cloudServiceApi";
import { careerOfferingApi } from "./api/careerOfferingApi";
import { settingsApi } from "./api/settingsApi";
import { favoriteApi } from "./api/favoriteApi";


export const store = configureStore({
  reducer: {
    // Slices
    auth: authReducer,
    user: userReducer,
    upload: uploadReducer,
    course: courseReducer,
    category: categoryReducer,

    // RTK Query APIs
    [authApi.reducerPath]: authApi.reducer,
    [roleAndPermissionApi.reducerPath]: roleAndPermissionApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [courseApi.reducerPath]: courseApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [labApi.reducerPath]: labApi.reducer,
    [technologySkillApi.reducerPath]: technologySkillApi.reducer,
    [learningApi.reducerPath]: learningApi.reducer,
    [digitalProgramApi.reducerPath]: digitalProgramApi.reducer,
    [webinarApi.reducerPath]: webinarApi.reducer,
    [assessmentApi.reducerPath]: assessmentApi.reducer,
    [examTopicsApi.reducerPath]: examTopicsApi.reducer,
    [certificationCatalogApi.reducerPath]: certificationCatalogApi.reducer,
    [certificationAdminApi.reducerPath]: certificationAdminApi.reducer,
    [voucherApi.reducerPath]: voucherApi.reducer,
    [supportApi.reducerPath]: supportApi.reducer,
    [legalApi.reducerPath]: legalApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    [siteContentApi.reducerPath]: siteContentApi.reducer,
    [cloudServiceApi.reducerPath]: cloudServiceApi.reducer,
    [careerOfferingApi.reducerPath]: careerOfferingApi.reducer,
    [settingsApi.reducerPath]: settingsApi.reducer,
    [favoriteApi.reducerPath]: favoriteApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(roleAndPermissionApi.middleware)
      .concat(userApi.middleware)
      .concat(courseApi.middleware)
      .concat(categoryApi.middleware)
      .concat(labApi.middleware)
      .concat(technologySkillApi.middleware)
      .concat(learningApi.middleware)
      .concat(digitalProgramApi.middleware)
      .concat(webinarApi.middleware)
      .concat(assessmentApi.middleware)
      .concat(examTopicsApi.middleware)
      .concat(certificationCatalogApi.middleware)
      .concat(certificationAdminApi.middleware)
      .concat(voucherApi.middleware)
      .concat(supportApi.middleware)
      .concat(legalApi.middleware)
      .concat(notificationApi.middleware)
      .concat(siteContentApi.middleware)
      .concat(cloudServiceApi.middleware)
      .concat(careerOfferingApi.middleware)
      .concat(settingsApi.middleware)
      .concat(favoriteApi.middleware)
  ,
});
