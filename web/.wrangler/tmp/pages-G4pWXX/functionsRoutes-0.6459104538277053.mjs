import { onRequestGet as __api_x_callback_ts_onRequestGet } from "C:\\Users\\46735\\Desktop\\MAIN\\web\\functions\\api\\x\\callback.ts"
import { onRequestGet as __api_x_login_ts_onRequestGet } from "C:\\Users\\46735\\Desktop\\MAIN\\web\\functions\\api\\x\\login.ts"
import { onRequestPost as __api_endorse_ts_onRequestPost } from "C:\\Users\\46735\\Desktop\\MAIN\\web\\functions\\api\\endorse.ts"
import { onRequestGet as __api_img_ts_onRequestGet } from "C:\\Users\\46735\\Desktop\\MAIN\\web\\functions\\api\\img.ts"
import { onRequestGet as __api_resolve_ts_onRequestGet } from "C:\\Users\\46735\\Desktop\\MAIN\\web\\functions\\api\\resolve.ts"
import { onRequestDelete as __api_session_ts_onRequestDelete } from "C:\\Users\\46735\\Desktop\\MAIN\\web\\functions\\api\\session.ts"
import { onRequestGet as __api_session_ts_onRequestGet } from "C:\\Users\\46735\\Desktop\\MAIN\\web\\functions\\api\\session.ts"

export const routes = [
    {
      routePath: "/api/x/callback",
      mountPath: "/api/x",
      method: "GET",
      middlewares: [],
      modules: [__api_x_callback_ts_onRequestGet],
    },
  {
      routePath: "/api/x/login",
      mountPath: "/api/x",
      method: "GET",
      middlewares: [],
      modules: [__api_x_login_ts_onRequestGet],
    },
  {
      routePath: "/api/endorse",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_endorse_ts_onRequestPost],
    },
  {
      routePath: "/api/img",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_img_ts_onRequestGet],
    },
  {
      routePath: "/api/resolve",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_resolve_ts_onRequestGet],
    },
  {
      routePath: "/api/session",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_session_ts_onRequestDelete],
    },
  {
      routePath: "/api/session",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_session_ts_onRequestGet],
    },
  ]