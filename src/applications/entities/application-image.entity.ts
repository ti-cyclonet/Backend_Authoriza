import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Application } from "./application.entity";

@Entity()
export class ApplicationImage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    strUrl: string;

    @ManyToOne(
        () => Application,
        ( application) => application.strImages,
    )
    strApplication: Application;
}