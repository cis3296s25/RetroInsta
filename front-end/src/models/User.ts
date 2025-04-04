/** representation of a user in our system*/
export interface User {
    _id: string, // mongo id
    googleId: string, // unique ID google assigns to our user just for our app
    email: string,

    username: string,
    profilePicPath: string, // path to profile photo
    bio?: string, // text that appears in bio on profile page

    postIDs: number[],
    
    // managed by mongo
    createdAt: Date,
    updatedAt: Date 
}