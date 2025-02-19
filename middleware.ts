import { clerkMiddleware } from '@clerk/nextjs/server'
 
export default clerkMiddleware({
    publicRoutes: ["/sign-in", "/sign-up"],
    afterAuth(auth, req, evt) {
      // Handle users who aren't authenticated
      if (!auth.userId && !auth.isPublicRoute) {
        return Response.redirect(new URL('/sign-in', req.url));
      }
      // Handle authenticated users trying to access auth pages
      if (auth.userId && (req.url.includes('/sign-in') || req.url.includes('/sign-up'))) {
        return Response.redirect(new URL('/', req.url));
      }
    }
  });
   
  export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
  };