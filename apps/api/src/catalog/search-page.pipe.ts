import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

/** Page 1–50; page 1 when missing. */
@Injectable()
export class SearchPagePipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    if (value === undefined) return 1;
    const page = Number(value);
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || page > 50)
      throw new BadRequestException('Choose a page from 1 to 50.');
    return page;
  }
}
