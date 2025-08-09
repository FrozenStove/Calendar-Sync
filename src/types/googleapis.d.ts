declare module 'googleapis' {
    export const google: any;
    export namespace calendar_v3 {
        export interface Calendar {
            version: string;
            auth: any;
            events: {
                list(params: any): Promise<any>;
                insert(params: any): Promise<any>;
                update(params: any): Promise<any>;
                delete(params: any): Promise<any>;
            };
            calendarList: {
                list(params: any): Promise<any>;
            };
        }
        export namespace Schema$ {
            export interface Event {
                id?: string;
                summary?: string;
                description?: string;
                location?: string;
                start?: {
                    dateTime?: string;
                    date?: string;
                    timeZone?: string;
                };
                end?: {
                    dateTime?: string;
                    date?: string;
                    timeZone?: string;
                };
                extendedProperties?: {
                    private?: { [key: string]: string };
                };
                updated?: string;
                status?: string;
            }
        }
    }
}

declare module 'google-auth-library' {
    export class JWT {
        constructor(options: {
            email: string;
            key: string;
            scopes: string[];
            subject?: string;
        });
    }
}