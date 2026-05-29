"use server"

// why do i explicitly need to define "use server" ?

import prisma from "@/lib/prisma";

export async function signUp(username : string , password : string , email : string){

    try {
        const user = await prisma.user.create({
            data : {
                email : email ,
                username : username ,
                password : password ,
            }
        })
        return user;
    } 
    catch (error : any) {
        console.error("SignUp Error:", error.message);
        throw error;
    }
    
}