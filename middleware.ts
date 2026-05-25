import {withAuth} from "next-auth/middleware"

export default withAuth(
    // this middleware function will run only if user is already authenticated
    // function middleware(){
    // } ,
    {
    pages : {
        signIn : "/signIn"
    }
})

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|signIn|signUp).*)"]
}