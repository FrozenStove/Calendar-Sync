declare module "ical.js" {
  export function parse(icsData: string): any;

  export class Component {
    constructor(jcalData: any);
    getAllSubcomponents(name: string): any[];
  }

  export class Event {
    constructor(vevent: any);
    summary: string;
    startDate: { toJSDate(): Date };
    endDate: { toJSDate(): Date };
    description?: string;
    location?: string;
    uid: string;
  }
}
