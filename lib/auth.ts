import { NextAuthOptions } from "next-auth";

export const authOptions : NextAuthOptions = {
    providers : [] ,
    pages : {
        signIn : "/signIn" ,
        newUser : "/signUp" ,
    }
}