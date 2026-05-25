import { NextAuthOptions } from "next-auth";
import prisma from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions : NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET ,
    session: {
        strategy: "jwt",
    },
    providers : [
        CredentialsProvider({
            credentials : {
                username : { label : "username" , type : "text" , placeholder : "samTense3"} ,
                password : { label : "Password" , type : "password" , placeholder : "******"} ,
            } ,
            async authorize(credentials){
                if(!credentials?.username || !credentials?.password){
                    return null ;
                }
                try {
                    const user = await prisma.user.findFirst({
                        where : {
                            name : credentials.username ,
                            password : credentials.password
                        }
                    })

                    if(!user) return null ;

                    return {username : user.username , id : user.id}
                } catch (error : any) {
                    console.log("Error in authorization : " , error.message)
                    return null ;
                }
            }
        })
    ] ,
    pages : {
        signIn : "/signIn" ,
        newUser : "/signUp" ,
    },

    callbacks : {
        async jwt({token , user , trigger} : any){
            if(trigger === "signOut") {
                console.log("cleared token , user signout")
                return null ;
            }
            if(user){
                const newToken = {
                    userId : user.id ,
                    username : user.username ,
                    iat : Math.floor(Date.now() / 1000),
                    exp : Math.floor(Date.now() / 1000) + (24 * 60 * 60),
                }
                return newToken
            }
            return token ;
        } ,
        async session({session , token} : any){
            if(!token || !token.userId) return null ;

            session.user = {
                userId : token.userId,
                username : token.username,
                email : token.email || null,
            }

            return session ;
        }
    },

    events : {
        async signOut(){

        }
    } ,
}