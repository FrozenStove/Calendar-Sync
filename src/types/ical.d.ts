declare module 'ical.js' {
    export function parse(input: string): any;

    export class Component {
        constructor(jcalData: any);
        getAllSubcomponents(name: string): any[];
    }

    export class Event {
        constructor(component: any);
        summary: string;
        description: string;
        location: string;
        uid: string;
        startDate: {
            toJSDate(): Date;
        };
        endDate: {
            toJSDate(): Date;
        };
        lastModifiedDate?: {
            toJSDate(): Date;
        };
        status?: string;
    }
}