import { Faction } from "./types";

export const INITIAL_DATA: any[] = [
  {
    id: 1,
    name: "LSSD",
    divisions: [
      {
        id: 1,
        name: "Central Patrol Division",
        color: "#1e5fa8",
        leadership: [
          {
            id: 1,
            rank: "DIVISION DIRECTOR",
            name: "FRANKLIN CLINTON",
            position: "DIVISION DIRECTOR",
            callsign: "CENTRAL-1",
            rankColor: "#000099"
          },
          {
            id: 2,
            rank: "CAPTAIN",
            name: "MICHAEL DE SANTA",
            position: "STATION COMMANDER",
            callsign: "CENTRAL-2",
            rankColor: "#284F6E"
          }
        ],
        bureaus: [
          {
            id: 1,
            name: "East Los Santos Station",
            color: "#1e5fa8",
            leadership: [
              {
                id: 1,
                rank: "LIEUTENANT",
                name: "TREVOR PHILIPS",
                position: "BUREAU COMMANDER",
                callsign: "EAST-1",
                rankColor: "#284F6E"
              }
            ],
            units: [
              {
                id: 1,
                name: "Patrol Operations",
                members: [
                  {
                    id: 1,
                    rank: "SERGEANT",
                    name: "LESTER CREST",
                    position: "FIELD SUPERVISOR",
                    callsign: "EAST-10",
                    isActing: true,
                    rankColor: "#990000"
                  },
                  {
                    id: 2,
                    rank: "DEPUTY SHERIFF",
                    name: "LAMAR DAVIS",
                    position: "FIELD TRAINING OFFICER",
                    callsign: "EAST-11",
                    rankColor: "#C29D13"
                  },
                  {
                    id: 3,
                    rank: "DEPUTY SHERIFF",
                    name: "WADE HEBERT",
                    position: "PATROL DEPUTY",
                    callsign: "EAST-12",
                    rankColor: "#C29D13"
                  }
                ]
              },
              {
                id: 2,
                name: "Traffic Enforcement",
                members: [
                  {
                    id: 4,
                    rank: "SERGEANT",
                    name: "RON JAKOWSKI",
                    position: "TRAFFIC SUPERVISOR",
                    callsign: "TRAFFIC-1",
                    rankColor: "#990000"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 2,
        name: "Special Operations Division",
        color: "#1e5fa8",
        leadership: [
          {
            id: 3,
            rank: "CAPTAIN",
            name: "SOLOMON RICHARDS",
            position: "DIVISION COMMANDER",
            callsign: "SPECIAL-1",
            rankColor: "#284F6E"
          }
        ],
        bureaus: [
          {
            id: 2,
            name: "Special Enforcement Bureau",
            color: "#1e5fa8",
            leadership: [
              {
                id: 2,
                rank: "LIEUTENANT",
                name: "SIMEON YETARIAN",
                position: "SEB COMMANDER",
                callsign: "SIERRA-1",
                rankColor: "#284F6E"
              }
            ],
            units: [
              {
                id: 3,
                name: "Special Weapons & Tactics",
                members: [
                  {
                    id: 5,
                    rank: "SERGEANT",
                    name: "BRAD SNIDER",
                    position: "TEAM LEADER",
                    callsign: "SIERRA-10",
                    rankColor: "#990000"
                  },
                  {
                    id: 6,
                    rank: "DEPUTY SHERIFF",
                    name: "AMANDA DE SANTA",
                    position: "OPERATOR",
                    callsign: "SIERRA-11",
                    rankColor: "#C29D13"
                  }
                ]
              },
              {
                id: 4,
                name: "Aero Bureau",
                members: [
                  {
                    id: 7,
                    rank: "DEPUTY SHERIFF",
                    name: "JIMMY DE SANTA",
                    position: "PILOT",
                    callsign: "AIR-1",
                    rankColor: "#C29D13"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];
