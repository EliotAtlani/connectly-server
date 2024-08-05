import { IsNumber, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(6)
  id!: string;
}

export class OnBoardUserDto {
  @IsString()
  userId!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsNumber()
  image!: number;
}

export class PatchUserSettings {
  @IsNumber()
  avatar!: number;
}

export class AddFriendDto {
  @IsString()
  userId!: string;

  @IsString()
  friendUsername!: string;
}

export class AcceptFriendDto {
  @IsString()
  userId!: string;

  @IsString()
  senderId!: string;
}

export class PatchChatSettings {
  @IsNumber()
  backgroundImage!: number;
}

export class PostDownloadImage {
  @IsString()
  url!: string;
}
