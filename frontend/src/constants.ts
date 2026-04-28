import { Faction } from "./types";

export const INITIAL_DATA: Faction[] = [
  {
    id: "lssd",
    name: "LSSD",
    divisions: [
      {
        id: "central-patrol",
        name: "Central Patrol Division",
        color: "#1e5fa8",
        leadership: [
          {
            id: "cpd-l1",
            rank: "DIVISION DIRECTOR",
            name: "FRANKLIN CLINTON",
            position: "DIVISION DIRECTOR",
            callsign: "CENTRAL-1",
            rankColor: "#000099"
          },
          {
            id: "cpd-l2",
            rank: "CAPTAIN",
            name: "MICHAEL DE SANTA",
            position: "STATION COMMANDER",
            callsign: "CENTRAL-2",
            rankColor: "#284F6E"
          }
        ],
        bureaus: [
          {
            id: "els-station",
            name: "East Los Santos Station",
            color: "#1e5fa8",
            leadership: [
              {
                id: "els-b1",
                rank: "LIEUTENANT",
                name: "TREVOR PHILIPS",
                position: "BUREAU COMMANDER",
                callsign: "EAST-1",
                rankColor: "#284F6E"
              }
            ],
            units: [
              {
                id: "els-u1",
                name: "Patrol Operations",
                members: [
                  {
                    id: "els-m1",
                    rank: "SERGEANT",
                    name: "LESTER CREST",
                    position: "FIELD SUPERVISOR",
                    callsign: "EAST-10",
                    isActing: true,
                    rankColor: "#990000"
                  },
                  {
                    id: "els-m2",
                    rank: "DEPUTY SHERIFF",
                    name: "LAMAR DAVIS",
                    position: "FIELD TRAINING OFFICER",
                    callsign: "EAST-11",
                    rankColor: "#C29D13"
                  },
                  {
                    id: "els-m3",
                    rank: "DEPUTY SHERIFF",
                    name: "WADE HEBERT",
                    position: "PATROL DEPUTY",
                    callsign: "EAST-12",
                    rankColor: "#C29D13"
                  }
                ]
              },
              {
                id: "els-u2",
                name: "Traffic Enforcement",
                members: [
                  {
                    id: "els-m4",
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
        id: "special-ops",
        name: "Special Operations Division",
        color: "#1e5fa8",
        leadership: [
          {
            id: "sod-l1",
            rank: "CAPTAIN",
            name: "SOLOMON RICHARDS",
            position: "DIVISION COMMANDER",
            callsign: "SPECIAL-1",
            rankColor: "#284F6E"
          }
        ],
        bureaus: [
          {
            id: "seb",
            name: "Special Enforcement Bureau",
            color: "#1e5fa8",
            leadership: [
              {
                id: "seb-b1",
                rank: "LIEUTENANT",
                name: "SIMEON YETARIAN",
                position: "SEB COMMANDER",
                callsign: "SIERRA-1",
                rankColor: "#284F6E"
              }
            ],
            units: [
              {
                id: "seb-u1",
                name: "Special Weapons & Tactics",
                members: [
                  {
                    id: "seb-m1",
                    rank: "SERGEANT",
                    name: "BRAD SNIDER",
                    position: "TEAM LEADER",
                    callsign: "SIERRA-10",
                    rankColor: "#990000"
                  },
                  {
                    id: "seb-m2",
                    rank: "DEPUTY SHERIFF",
                    name: "AMANDA DE SANTA",
                    position: "OPERATOR",
                    callsign: "SIERRA-11",
                    rankColor: "#C29D13"
                  }
                ]
              },
              {
                id: "seb-u2",
                name: "Aero Bureau",
                members: [
                  {
                    id: "seb-m3",
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
